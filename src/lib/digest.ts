import { db } from "./db";
import { addDaysToKey, rangeOfDayKeys, todayKey } from "./dates";
import { sendMail } from "./email";
import { weeklyDigestEmail, type DigestEvent } from "./email-templates";
import { expandOccurrences } from "./recurrence";
import { placeLabel } from "./queries";
import type { Locale } from "./types";

/** Events starting in the next 7 days (today included), chronologically. */
export async function eventsForWeek(now: Date, locale: Locale) {
  const fromKey = todayKey(now);
  const toKey = addDaysToKey(fromKey, 6);
  const { start, end } = rangeOfDayKeys(fromKey, toKey);
  const rows = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { recurrence: "NONE", startAt: { gte: start, lt: end } },
        { recurrence: { not: "NONE" }, startAt: { lt: end }, OR: [{ recurrenceEnd: { gte: start } }, { recurrenceEnd: null }] },
      ],
    },
    include: { venue: true },
  });
  const events: DigestEvent[] = [];
  for (const e of rows) {
    for (const occ of expandOccurrences(e, start, end)) {
      events.push({
        eventId: e.id,
        title: e.title,
        startAt: occ.startAt,
        endAt: occ.endAt,
        place: placeLabel(e.venue, e.customLocation, locale),
      });
    }
  }
  events.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return { fromKey, toKey, events };
}

export async function sendWeeklyDigest(now = new Date()): Promise<{ sent: number; failed: number }> {
  const subscribers = await db.subscriber.findMany({ where: { confirmedAt: { not: null } } });
  const cache = new Map<Locale, Awaited<ReturnType<typeof eventsForWeek>>>();
  let sent = 0;
  let failed = 0;
  for (const s of subscribers) {
    const locale: Locale = s.locale === "en" ? "en" : "fr";
    if (!cache.has(locale)) cache.set(locale, await eventsForWeek(now, locale));
    const week = cache.get(locale)!;
    try {
      await sendMail(weeklyDigestEmail(s.email, s.token, locale, { fromKey: week.fromKey, toKey: week.toKey }, week.events));
      await db.subscriber.update({ where: { id: s.id }, data: { lastSentAt: now } });
      sent++;
    } catch (error) {
      console.error("[digest] failed for", s.email, error);
      failed++;
    }
  }
  return { sent, failed };
}
