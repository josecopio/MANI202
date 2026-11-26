/**
 * MOCK DATA for the demo video: simplified 2D plans of a few houses with their entrances,
 * and the text of the 7am push notification. Nothing here comes from the database.
 *
 * An entrance is closed when the event books (LIMITED or CLOSED) one of the spaces listed in
 * `closedBy`; a room is shaded when it is the booked space or listed with it in `closedWith`.
 * Space names are the French venue names used by the seed (Venue.nameFr).
 */
import type { Locale, SpaceImpact } from "./types";

type L = { fr: string; en: string };

export type PlanRoom = {
  id: string;
  label: L;
  x: number;
  y: number;
  w: number;
  h: number;
  /** French venue name this room stands for. */
  space?: string;
  /** Also off limits when one of these spaces is booked. */
  closedWith?: string[];
  outdoor?: boolean;
  /** Vertical position of the label inside the room (default: middle). */
  labelY?: number;
};

export type PlanDoor = {
  id: string;
  label: L;
  /** Point on the building outline. */
  x: number;
  y: number;
  /** Side of the building the door is on: the arrow comes from outside. */
  side: "top" | "bottom" | "left" | "right";
  closedBy: string[];
};

export type HousePlan = {
  rooms: PlanRoom[];
  doors: PlanDoor[];
  /** Streets / paths drawn around the building. */
  streets: { x: number; y: number; w: number; h: number; label: L }[];
  /** Paved areas (forecourt...), drawn before the rooms. */
  paved?: { x: number; y: number; w: number; h: number; label?: L; closedWith?: string[] }[];
};

const PLANS: Record<string, HousePlan> = {
  "maison-internationale": {
    streets: [
      { x: 0, y: 262, w: 360, h: 38, label: { fr: "Boulevard Jourdan", en: "Boulevard Jourdan" } },
      { x: 0, y: 0, w: 360, h: 26, label: { fr: "Parc de la Cité", en: "Cité park" } },
    ],
    paved: [{ x: 110, y: 204, w: 130, h: 58, label: { fr: "Parvis", en: "Forecourt" }, closedWith: ["Auditorium"] }],
    rooms: [
      { id: "auditorium", label: { fr: "Auditorium", en: "Auditorium" }, x: 36, y: 64, w: 74, h: 140, space: "Auditorium", labelY: 30 },
      { id: "salon", label: { fr: "Grand salon", en: "Grand salon" }, x: 110, y: 64, w: 74, h: 52, space: "Grand salon" },
      { id: "accueil", label: { fr: "Accueil", en: "Reception" }, x: 184, y: 64, w: 56, h: 52 },
      { id: "foyer", label: { fr: "Foyer", en: "Foyer" }, x: 110, y: 116, w: 130, h: 88, closedWith: ["Auditorium"], labelY: 34 },
      { id: "cafe", label: { fr: "Café", en: "Café" }, x: 240, y: 96, w: 72, h: 108, space: "Café" },
    ],
    doors: [
      { id: "main", label: { fr: "Entrée principale", en: "Main entrance" }, x: 175, y: 204, side: "bottom", closedBy: ["Auditorium"] },
      { id: "north", label: { fr: "Porte nord", en: "North door" }, x: 212, y: 64, side: "top", closedBy: [] },
      { id: "side", label: { fr: "Entrée latérale du café", en: "Café side entrance" }, x: 312, y: 150, side: "right", closedBy: ["Café"] },
      { id: "artists", label: { fr: "Porte de l’auditorium", en: "Auditorium door" }, x: 36, y: 134, side: "left", closedBy: ["Auditorium"] },
    ],
  },
  japon: {
    streets: [{ x: 0, y: 0, w: 360, h: 34, label: { fr: "Allée de la Cité", en: "Cité walkway" } }],
    rooms: [
      { id: "salon", label: { fr: "Salon commun", en: "Common lounge" }, x: 40, y: 74, w: 104, h: 100, space: "Salon commun" },
      { id: "hall", label: { fr: "Hall", en: "Hall" }, x: 144, y: 74, w: 72, h: 100, closedWith: ["Salon commun"] },
      { id: "stairs", label: { fr: "Escalier · étages", en: "Stairs · floors" }, x: 216, y: 74, w: 104, h: 100 },
      { id: "garden", label: { fr: "Jardin", en: "Garden" }, x: 40, y: 196, w: 280, h: 80, space: "Jardin", outdoor: true },
    ],
    doors: [
      { id: "main", label: { fr: "Entrée principale", en: "Main entrance" }, x: 180, y: 74, side: "top", closedBy: ["Salon commun"] },
      { id: "rear", label: { fr: "Entrée arrière", en: "Rear entrance" }, x: 268, y: 174, side: "bottom", closedBy: [] },
      { id: "gate", label: { fr: "Portail du jardin", en: "Garden gate" }, x: 320, y: 236, side: "right", closedBy: ["Jardin"] },
    ],
  },
};

export type MapEvent = { houseSlug: string | null; spaceFr: string; spaceImpact: SpaceImpact };

export type ResolvedPlan = {
  plan: HousePlan;
  closedRooms: Set<string>;
  closedPaved: Set<number>;
  doors: (PlanDoor & { open: boolean })[];
};

export function hasPlan(houseSlug: string | null | undefined): boolean {
  return !!houseSlug && houseSlug in PLANS;
}

/** The house plan with today's state of every room and entrance, or null when the house has no plan. */
export function resolvePlan(e: MapEvent): ResolvedPlan | null {
  if (!e.houseSlug || !PLANS[e.houseSlug] || e.spaceImpact === "NONE") return null;
  const plan = PLANS[e.houseSlug];
  const s = e.spaceFr;
  const closedRooms = new Set(plan.rooms.filter((r) => r.space === s || r.closedWith?.includes(s)).map((r) => r.id));
  const closedPaved = new Set((plan.paved ?? []).flatMap((p, i) => (p.closedWith?.includes(s) ? [i] : [])));
  return { plan, closedRooms, closedPaved, doors: plan.doors.map((d) => ({ ...d, open: !d.closedBy.includes(s) })) };
}

export const tr = (l: L, locale: Locale) => (locale === "fr" ? l.fr : l.en);

/**
 * Body of the 7am push notification (mock): only access restrictions and workarounds,
 * one building per notification. Keyed by the French title of the seeded event.
 */
const PUSH_TEXT: Record<string, L> = {
  "Colloque international de santé publique": {
    fr: "Maison internationale, 7h30–19h : entrée principale, foyer et auditorium fermés. Entrez par la porte nord ; le café reste ouvert par l’entrée latérale. Bracelet vert à retirer à l’accueil.",
    en: "Maison internationale, 7:30am–7pm: main entrance, foyer and auditorium closed. Use the north door; the café stays open via its side entrance. Green bracelet at reception.",
  },
  "Séminaire de direction": {
    fr: "Maison du Japon, 14h–19h : salon commun et entrée principale fermés. Passez par l’entrée arrière pour rejoindre les étages.",
    en: "Maison du Japon, 2pm–7pm: common lounge and main entrance closed. Use the rear entrance to reach the floors.",
  },
};

export function pushBody(titleFr: string, locale: Locale, fallback: string): string {
  const t = PUSH_TEXT[titleFr];
  return t ? tr(t, locale) : fallback;
}
