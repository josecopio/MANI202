import { cookies } from "next/headers";
import { db } from "./db";
import { EMPTY_PREFS, type Prefs } from "./prefs-shared";

export const PREFS_COOKIE = "ciup-prefs";
const SLUG_RE = /^[a-z0-9-]{1,60}$/;

type Stored = { h?: unknown; o?: unknown; i?: unknown; g?: unknown };

const slugList = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && SLUG_RE.test(x)))].slice(0, 60) : [];

/** Reads the resident's preferences from their cookie, dropping anything that no longer exists. */
export async function getPrefs(): Promise<Prefs> {
  const raw = (await cookies()).get(PREFS_COOKIE)?.value;
  if (!raw) return EMPTY_PREFS;
  let stored: Stored;
  try {
    stored = JSON.parse(raw) as Stored;
  } catch {
    return EMPTY_PREFS;
  }
  const [houses, categories] = await Promise.all([
    db.house.findMany({ select: { slug: true, isResidence: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  const known = new Map(houses.map((h) => [h.slug, h]));
  const knownCats = new Set(categories.map((c) => c.slug));
  const home = typeof stored.h === "string" && known.get(stored.h)?.isResidence ? stored.h : null;
  return {
    home,
    houses: slugList(stored.o).filter((s) => known.has(s) && s !== home),
    interests: slugList(stored.i).filter((s) => knownCats.has(s)),
    general: stored.g !== 0,
    configured: true,
  };
}

export function serializePrefs(p: Omit<Prefs, "configured">): string {
  return JSON.stringify({ h: p.home, o: p.houses, i: p.interests, g: p.general ? 1 : 0 });
}

export async function writePrefs(p: Omit<Prefs, "configured">): Promise<void> {
  (await cookies()).set(PREFS_COOKIE, serializePrefs(p), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
