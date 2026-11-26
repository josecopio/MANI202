import { db } from "./db";
import { expandOccurrences } from "./recurrence";
import { hasRestrictions } from "./restrictions";
import type { Locale } from "./types";

export type HouseView = {
  id: string;
  slug: string;
  name: string;
  nameFr: string;
  nameEn: string;
  isResidence: boolean;
  sortOrder: number;
  color: string;
  /** Library, restaurant, pool, gym…: chosen in their own section, apart from the houses. */
  isFacility: boolean;
};

/** Shared facilities (not houses) — listed in their own section of the preferences. */
export const FACILITY_SLUGS = ["bibliotheque", "restaurant-crous", "piscine", "salle-de-musculation"];
export const isFacility = (slug: string) => FACILITY_SLUGS.includes(slug);

export type SpaceView = { id: string; houseId: string | null; name: string; isOther: boolean };

// Twelve clearly different hues, each dark enough for text on its own light tint (>= 4.5:1).
const PALETTE = [
  "#0b6e99", "#b4440e", "#6b2f8a", "#17803d", "#b91c1c", "#4a5568",
  "#9a6700", "#0e7490", "#7a4b2a", "#1d4ed8", "#4d7c0f", "#be185d",
];

/** Colour of the n-th house of the list: neighbours in the list never look alike. */
export function houseColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export async function getHouses(locale: Locale): Promise<HouseView[]> {
  const rows = await db.house.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }] });
  return rows.map((h, i) => ({ ...h, name: locale === "fr" ? h.nameFr : h.nameEn, color: houseColor(i), isFacility: isFacility(h.slug) }));
}

export async function getHouseBySlug(slug: string, locale: Locale) {
  const h = await db.house.findUnique({ where: { slug }, include: { venues: { orderBy: { sortOrder: "asc" } } } });
  if (!h) return null;
  // The colour depends on the position in the full list, so a house keeps its colour on every page.
  const all = await db.house.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }], select: { slug: true } });
  const { venues: _venues, ...house } = h;
  return {
    house: { ...house, name: locale === "fr" ? h.nameFr : h.nameEn, color: houseColor(all.findIndex((x) => x.slug === slug)), isFacility: isFacility(slug) } as HouseView,
    spaces: h.venues.map((v) => ({ id: v.id, houseId: v.houseId, isOther: v.isOther, name: locale === "fr" ? v.nameFr : v.nameEn })),
  };
}

export type HouseSummary = { upcoming: number; restricted: number };

/** Number of events in the next 30 days per house (series are counted per occurrence). */
export async function getHouseSummaries(now = new Date()): Promise<Map<string, HouseSummary>> {
  const end = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const rows = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      houseId: { not: null },
      OR: [
        { recurrence: "NONE", endAt: { gte: now }, startAt: { lt: end } },
        { recurrence: { not: "NONE" }, startAt: { lt: end }, OR: [{ recurrenceEnd: { gte: now } }, { recurrenceEnd: null }] },
      ],
    },
    include: { house: { select: { slug: true } } },
  });
  const out = new Map<string, HouseSummary>();
  for (const e of rows) {
    const slug = e.house!.slug;
    const n = expandOccurrences(e, now, end).length;
    const cur = out.get(slug) ?? { upcoming: 0, restricted: 0 };
    cur.upcoming += n;
    if (hasRestrictions(e)) cur.restricted += n;
    out.set(slug, cur);
  }
  return out;
}
