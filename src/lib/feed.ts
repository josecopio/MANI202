import { db } from "./db";
import { buildCalendar, type IcsEvent } from "./ics";
import { getMessagesFor } from "./i18n";
import { eventUrl, getSiteDomain } from "./site";
import { placeLabel } from "./queries";
import type { Locale } from "./types";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

function loadRows(where: Record<string, unknown>) {
  return db.event.findMany({
    where: { status: "PUBLISHED", ...where },
    include: { venue: true, category: true },
    orderBy: { startAt: "asc" },
  });
}

export function toIcsEvent(e: Row, locale: Locale): IcsEvent {
  const m = getMessagesFor(locale);
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    startAt: e.startAt,
    endAt: e.endAt,
    location: placeLabel(e.venue, e.customLocation, locale),
    categoryName: locale === "fr" ? e.category.nameFr : e.category.nameEn,
    organiserName: e.organiserName,
    audienceLabel: e.audience === "RESIDENTS_ONLY" ? m.card.audienceResidents : m.card.audiencePublic,
    url: eventUrl(e.id),
    recurrence: e.recurrence,
    recurrenceEnd: e.recurrenceEnd,
    updatedAt: e.updatedAt,
  };
}

/** Public feed: published events from 30 days ago onwards, plus series that are still running. */
export async function buildFeed(options: { categorySlugs: string[]; locale: Locale; now?: Date }): Promise<string> {
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const rows = await loadRows({
    OR: [
      { recurrence: "NONE", endAt: { gte: since } },
      { recurrence: { not: "NONE" }, OR: [{ recurrenceEnd: { gte: since } }, { recurrenceEnd: null }] },
    ],
    ...(options.categorySlugs.length ? { category: { slug: { in: options.categorySlugs } } } : {}),
  });
  return buildCalendar(
    rows.map((r) => toIcsEvent(r, options.locale)),
    { calendarName: getMessagesFor(options.locale).meta.siteName, domain: getSiteDomain(), now },
  );
}
