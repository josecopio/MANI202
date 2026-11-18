// Resident preferences. Safe to import from client components (no server-only code).

export type Prefs = {
  /** Slug of the resident's own house ("ma maison"), or null if not chosen. */
  home: string | null;
  /** Other houses whose calendar the resident follows (houses they use day to day). */
  houses: string[];
  /** Category slugs the resident is interested in, for the general calendar. */
  interests: string[];
  /** Whether general (non house-specific) events are part of "My calendar". */
  general: boolean;
  /** True once the resident has saved their choices at least once. */
  configured: boolean;
};

export const EMPTY_PREFS: Prefs = { home: null, houses: [], interests: [], general: true, configured: false };

/** Every house the resident follows, home first, without duplicates. */
export function followedHouses(p: Pick<Prefs, "home" | "houses">): string[] {
  return [...new Set([...(p.home ? [p.home] : []), ...p.houses])];
}

/** HOUSE_ONLY events are for the residents of the host house only. */
export function isEligible(audience: string, houseSlug: string | null, home: string | null): boolean {
  if (audience !== "HOUSE_ONLY") return true;
  return !!houseSlug && houseSlug === home;
}
