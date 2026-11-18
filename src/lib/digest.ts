import { db } from "./db";
import { addDaysToKey, rangeOfDayKeys, todayKey } from "./dates";
import { sendMail } from "./email";
import { weeklyDigestEmail, type DigestEvent } from "./email-templates";
import { expandOccurrences } from "./recurrence";
import { inScope, placeLabel } from "./queries";
import { isEligible } from "./prefs-shared";
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
    include: { venue: true, house: true, category: true },
  });
  const events: DigestEvent[] = [];
  for (const e of rows) {
    for (const occ of expandOccurrences(e, start, end)) {
      events.push({
        eventId: e.id,
        title: e.title,
        startAt: occ.startAt,
        endAt: occ.endAt,
        place: placeLabel(e.house, e.venue, e.customLocation, locale),
        houseSlug: e.house?.slug ?? null,
        categorySlug: e.category.slug,
        audience: e.audience,
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
    // Subscribers who chose houses/interests only get those; older sign-ups (nothing chosen) get everything.
    const houses = s.houseSlugs ? s.houseSlugs.split(",") : [];
    const interests = s.categorySlugs ? s.categorySlugs.split(",") : [];
    const personal = houses.length > 0 || interests.length > 0;
    const mine = personal
      ? week.events.filter((e) => inScope({ kind: "mine", houses, interests, general: true }, {
          houseSlug: e.houseSlug,
          categorySlug: e.categorySlug,
          eligible: isEligible(e.audience, e.houseSlug, s.homeSlug || null),
        }))
      : week.events;
    try {
      await sendMail(weeklyDigestEmail(s.email, s.token, locale, { fromKey: week.fromKey, toKey: week.toKey }, mine));
      await db.subscriber.update({ where: { id: s.id }, data: { lastSentAt: now } });
      sent++;
    } catch (error) {
      console.error("[digest] failed for", s.email, error);
      failed++;
    }
  }
  return { sent, failed };
}
