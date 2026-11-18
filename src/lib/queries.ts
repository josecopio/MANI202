import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { dayKeyOf, monthGrid, rangeOfDayKeys, type MonthRef } from "./dates";
import { expandOccurrences } from "./recurrence";
import { normalizeText } from "./utils";
import type { Audience, Locale, Recurrence } from "./types";

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

export function placeLabel(
  venue: { nameFr: string; nameEn: string; isOther: boolean },
  customLocation: string | null,
  locale: Locale,
): string {
  const name = locale === "fr" ? venue.nameFr : venue.nameEn;
  if (!customLocation) return name;
  return venue.isOther ? customLocation : `${name} · ${customLocation}`;
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
  organiserName: string;
  audience: Audience;
  registrationUrl: string | null;
  recurrence: Recurrence;
  recurrenceEnd: string | null; // day key
  isSample: boolean;
};

export type CalendarQuery = {
  month: MonthRef;
  categorySlugs: string[];
  q: string;
  /** When set, only events whose id is in this set are returned ("My list"). */
  onlyEventIds?: string[] | null;
  locale: Locale;
};

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
  };

  const rows = await db.event.findMany({ where, include: { venue: true, category: true } });
  const needle = normalizeText(query.q);

  const out: CalendarEvent[] = [];
  for (const e of rows) {
    const place = placeLabel(e.venue, e.customLocation, query.locale);
    if (needle) {
      const haystack = normalizeText(
        [e.title, e.organiserName, e.venue.nameFr, e.venue.nameEn, e.customLocation ?? ""].join(" "),
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
        organiserName: e.organiserName,
        audience: e.audience,
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
    include: { venue: true, category: true, createdBy: { select: { id: true, email: true, name: true } } },
  });
}
