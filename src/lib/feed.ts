import { db } from "./db";
import { buildCalendar, type IcsEvent } from "./ics";
import { getMessagesFor } from "./i18n";
import { eventUrl, getSiteDomain } from "./site";
import { inScope, placeLabel, type CalendarScope } from "./queries";
import { isEligible } from "./prefs-shared";
import { restrictionLines } from "./restrictions";
import type { Locale } from "./types";

type Row = Awaited<ReturnType<typeof loadRows>>[number];

function loadRows(where: Record<string, unknown>) {
  return db.event.findMany({
    where: { status: "PUBLISHED", ...where },
    include: { venue: true, house: true, category: true },
    orderBy: { startAt: "asc" },
  });
}

export function toIcsEvent(e: Row, locale: Locale): IcsEvent {
  const m = getMessagesFor(locale);
  const houseName = e.house ? (locale === "fr" ? e.house.nameFr : e.house.nameEn) : null;
  return {
    id: e.id,
    // In a merged calendar the house is the first thing a resident wants to know.
    title: houseName ? `[${houseName}] ${e.title}` : e.title,
    description: e.description,
    startAt: e.startAt,
    endAt: e.endAt,
    location: placeLabel(e.house, e.venue, e.customLocation, locale),
    categoryName: locale === "fr" ? e.category.nameFr : e.category.nameEn,
    organiserName: e.organiserName,
    audienceLabel: undefined,
    extraLines: restrictionLines(m, {
      audience: e.audience,
      houseName,
      spaceImpact: e.spaceImpact,
      restrictionNote: e.restrictionNote,
    }),
    url: eventUrl(e.id),
    recurrence: e.recurrence,
    recurrenceEnd: e.recurrenceEnd,
    updatedAt: e.updatedAt,
  };
}

export type FeedOptions = {
  /** Houses whose events are all included (restrictions explain what is closed or reserved). */
  houses: string[];
  /** Also include general events open to the subscriber, filtered by `categorySlugs`. */
  general: boolean;
  categorySlugs: string[];
  /** The subscriber's own house: its reserved events count as open to them. */
  home: string | null;
  locale: Locale;
  now?: Date;
};

/**
 * Feed of published events from 30 days ago onwards, plus series that are still running.
 *  - ?houses=a,b  → everything in those houses;
 *  - ?general=1   → plus general events open to the subscriber (narrowed by ?category=);
 *  - neither      → the whole calendar (narrowed by ?category=), as before.
 */
export async function buildFeed(options: FeedOptions): Promise<string> {
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const personal = options.houses.length > 0 || options.general;
  const rows = await loadRows({
    OR: [
      { recurrence: "NONE", endAt: { gte: since } },
      { recurrence: { not: "NONE" }, OR: [{ recurrenceEnd: { gte: since } }, { recurrenceEnd: null }] },
    ],
    // Without personal options the category filter is applied in the database, as it always was.
    ...(!personal && options.categorySlugs.length ? { category: { slug: { in: options.categorySlugs } } } : {}),
  });

  const scope: CalendarScope = personal
    ? { kind: "mine", houses: options.houses, interests: options.categorySlugs, general: options.general }
    : { kind: "general" };
  const kept = rows.filter((r) => {
    const houseSlug = r.house?.slug ?? null;
    const eligible = isEligible(r.audience, houseSlug, options.home);
    if (!personal) return true;
    // "general" with no category filter means every category.
    const effective: CalendarScope =
      scope.kind === "mine" && options.categorySlugs.length === 0
        ? { ...scope, interests: [r.category.slug] }
        : scope;
    return inScope(effective, { houseSlug, categorySlug: r.category.slug, eligible });
  });

  const m = getMessagesFor(options.locale);
  return buildCalendar(
    kept.map((r) => toIcsEvent(r, options.locale)),
    { calendarName: personal ? m.meta.personalCalendarName : m.meta.siteName, domain: getSiteDomain(), now },
  );
}
