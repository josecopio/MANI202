import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { dayKeyOf, monthGrid, rangeOfDayKeys, type MonthRef } from "./dates";
import { expandOccurrences } from "./recurrence";
import { normalizeText } from "./utils";
import { isEligible } from "./prefs-shared";
import type { Audience, Locale, Recurrence, SpaceImpact } from "./types";

// ---- Reference data ---------------------------------------------------------

export type CategoryView = {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  nameEn: string;
  color: string;
  bgColor: string;
  sortOrder: number;
};

export type VenueView = {
  id: string;
  houseId: string | null;
  name: string;
  nameFr: string;
  nameEn: string;
  isOther: boolean;
  sortOrder: number;
};

export async function getCategories(locale: Locale): Promise<CategoryView[]> {
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }] });
  return rows.map((c) => ({ ...c, name: locale === "fr" ? c.nameFr : c.nameEn }));
}

export async function getVenues(locale: Locale): Promise<VenueView[]> {
  const rows = await db.venue.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }] });
  return rows.map((v) => ({ ...v, name: locale === "fr" ? v.nameFr : v.nameEn }));
}

type PlaceHouse = { nameFr: string; nameEn: string } | null | undefined;

/** "Maison du Japon · Salon commun", or just the space for events that belong to no house. */
export function placeLabel(
  house: PlaceHouse,
  venue: { nameFr: string; nameEn: string; isOther: boolean },
  customLocation: string | null,
  locale: Locale,
): string {
  const space = locale === "fr" ? venue.nameFr : venue.nameEn;
  const detail = customLocation ? (venue.isOther ? customLocation : `${space} · ${customLocation}`) : space;
  if (!house) return detail;
  const houseName = locale === "fr" ? house.nameFr : house.nameEn;
  return `${houseName} · ${detail}`;
}

// ---- Calendar ---------------------------------------------------------------

export type CalendarEvent = {
  key: string; // eventId@dayKey - unique per occurrence
  eventId: string;
  dayKey: string;
  startAt: string; // ISO
  endAt: string;
  title: string;
  description: string;
  categorySlug: string;
  place: string;
  houseSlug: string | null;
  houseName: string | null;
  organiserName: string;
  audience: Audience;
  spaceImpact: SpaceImpact;
  restrictionNote: string | null;
  /** False when the event is reserved for the residents of another house than the viewer's. */
  eligible: boolean;
  registrationUrl: string | null;
  recurrence: Recurrence;
  recurrenceEnd: string | null; // day key
  isSample: boolean;
};

/** Which events a calendar page shows. */
export type CalendarScope =
  /** "My calendar": everything in the followed houses, plus general events matching the interests. */
  | { kind: "mine"; houses: string[]; interests: string[]; general: boolean }
  /** One house: everything that happens there. */
  | { kind: "house"; slug: string }
  /** The general calendar: every event the viewer may attend, whatever the house. */
  | { kind: "general" };

export type CalendarQuery = {
  month: MonthRef;
  scope: CalendarScope;
  /** The viewer's own house, to tell which house-only events are for them. */
  home: string | null;
  categorySlugs: string[];
  q: string;
  /** When set, only events whose id is in this set are returned ("My list"). */
  onlyEventIds?: string[] | null;
  locale: Locale;
};

/**
 * The scope rules, shared by the pages and the calendar feed:
 *  - events in a followed house are always shown, including the ones reserved for other houses,
 *    because they tell the resident what is closed or restricted in the houses they use;
 *  - general events are only shown when the viewer may attend them (reserved events of other
 *    houses are left out) and when their category is one of the viewer's interests.
 */
export function inScope(
  scope: CalendarScope,
  e: { houseSlug: string | null; categorySlug: string; eligible: boolean },
): boolean {
  switch (scope.kind) {
    case "house":
      return e.houseSlug === scope.slug;
    case "general":
      return e.eligible;
    case "mine":
      if (e.houseSlug && scope.houses.includes(e.houseSlug)) return true;
      return scope.general && e.eligible && scope.interests.includes(e.categorySlug);
  }
}

/**
 * Published occurrences visible in the month grid (including the adjacent days shown
 * muted), sorted chronologically. Search is done in memory so it is accent-insensitive
 * and behaves identically on SQLite and PostgreSQL.
 */
export async function getCalendarEvents(query: CalendarQuery): Promise<CalendarEvent[]> {
  const grid = monthGrid(query.month);
  const { start, end } = rangeOfDayKeys(grid[0].key, grid[grid.length - 1].key);

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    OR: [
      { recurrence: "NONE", startAt: { gte: start, lt: end } },
      {
        recurrence: { not: "NONE" },
        startAt: { lt: end },
        OR: [{ recurrenceEnd: { gte: start } }, { recurrenceEnd: null }],
      },
    ],
    ...(query.categorySlugs.length ? { category: { slug: { in: query.categorySlugs } } } : {}),
    ...(query.onlyEventIds ? { id: { in: query.onlyEventIds } } : {}),
    ...(query.scope.kind === "house" ? { house: { slug: query.scope.slug } } : {}),
  };

  const rows = await db.event.findMany({ where, include: { venue: true, category: true, house: true } });
  const needle = normalizeText(query.q);

  const out: CalendarEvent[] = [];
  for (const e of rows) {
    const houseSlug = e.house?.slug ?? null;
    const eligible = isEligible(e.audience, houseSlug, query.home);
    if (!inScope(query.scope, { houseSlug, categorySlug: e.category.slug, eligible })) continue;
    const place = placeLabel(e.house, e.venue, e.customLocation, query.locale);
    if (needle) {
      const haystack = normalizeText(
        [e.title, e.organiserName, e.venue.nameFr, e.venue.nameEn, e.house?.nameFr ?? "", e.house?.nameEn ?? "", e.customLocation ?? ""].join(" "),
      );
      if (!haystack.includes(needle)) continue;
    }
    for (const occ of expandOccurrences(e, start, end)) {
      out.push({
        key: `${e.id}@${occ.dayKey}`,
        eventId: e.id,
        dayKey: occ.dayKey,
        startAt: occ.startAt.toISOString(),
        endAt: occ.endAt.toISOString(),
        title: e.title,
        description: e.description,
        categorySlug: e.category.slug,
        place,
        houseSlug,
        houseName: e.house ? (query.locale === "fr" ? e.house.nameFr : e.house.nameEn) : null,
        organiserName: e.organiserName,
        audience: e.audience,
        spaceImpact: e.spaceImpact,
        restrictionNote: e.restrictionNote,
        eligible,
        registrationUrl: e.registrationUrl,
        recurrence: e.recurrence,
        recurrenceEnd: e.recurrenceEnd ? dayKeyOf(e.recurrenceEnd) : null,
        isSample: e.isSample,
      });
    }
  }
  out.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
  return out;
}

// ---- Interests ----------------------------------------------------------------

export async function getInterestedEventIds(owner: {
  userId?: string | null;
  deviceId?: string | null;
}): Promise<string[]> {
  const or: Prisma.InterestWhereInput[] = [];
  if (owner.userId) or.push({ userId: owner.userId });
  if (owner.deviceId) or.push({ deviceId: owner.deviceId });
  if (!or.length) return [];
  const rows = await db.interest.findMany({ where: { OR: or }, select: { eventId: true } });
  return [...new Set(rows.map((r) => r.eventId))];
}

// ---- Single event ------------------------------------------------------------

export async function getEventWithRelations(id: string) {
  return db.event.findUnique({
    where: { id },
    include: { venue: true, house: true, category: true, createdBy: { select: { id: true, email: true, name: true } } },
  });
}
