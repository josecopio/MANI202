"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPrefs, writePrefs } from "@/lib/prefs";
import type { Prefs } from "@/lib/prefs-shared";

export type PrefsInput = Pick<Prefs, "home" | "houses" | "interests" | "general">;

/** Saves the resident's houses and interests (stored in a cookie: no account needed). */
export async function savePrefsAction(input: PrefsInput): Promise<{ ok: boolean }> {
  const [houses, categories] = await Promise.all([
    db.house.findMany({ select: { slug: true, isResidence: true } }),
    db.category.findMany({ select: { slug: true } }),
  ]);
  const known = new Map(houses.map((h) => [h.slug, h.isResidence]));
  const knownCats = new Set(categories.map((c) => c.slug));
  const home = typeof input.home === "string" && known.get(input.home) ? input.home : null;
  const others = (Array.isArray(input.houses) ? input.houses : []).filter((s) => typeof s === "string" && known.has(s) && s !== home);
  const interests = (Array.isArray(input.interests) ? input.interests : []).filter((s) => typeof s === "string" && knownCats.has(s));
  await writePrefs({ home, houses: [...new Set(others)], interests: [...new Set(interests)], general: !!input.general });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Follow / unfollow one house (used by the "Follow" buttons on the house pages). */
export async function toggleHouseAction(slug: string): Promise<{ ok: boolean; following: boolean }> {
  const house = typeof slug === "string" ? await db.house.findUnique({ where: { slug }, select: { slug: true } }) : null;
  if (!house) return { ok: false, following: false };
  const p = await getPrefs();
  const categories = await db.category.findMany({ select: { slug: true } });
  const isHome = p.home === slug;
  const following = isHome || p.houses.includes(slug);
  const houses = following ? p.houses.filter((s) => s !== slug) : [...p.houses, slug];
  await writePrefs({
    home: isHome ? null : p.home,
    houses,
    // First visit: follow every category until the resident narrows it down.
    interests: p.configured ? p.interests : categories.map((c) => c.slug),
    general: p.configured ? p.general : true,
  });
  revalidatePath("/", "layout");
  return { ok: true, following: !following };
}

/** Marks a house as "my house" (moves it out of the other houses if needed). */
export async function setHomeAction(slug: string | null): Promise<{ ok: boolean }> {
  const house = slug ? await db.house.findUnique({ where: { slug }, select: { slug: true, isResidence: true } }) : null;
  if (slug && !house?.isResidence) return { ok: false };
  const p = await getPrefs();
  const categories = await db.category.findMany({ select: { slug: true } });
  await writePrefs({
    home: slug,
    houses: p.houses.filter((s) => s !== slug),
    interests: p.configured ? p.interests : categories.map((c) => c.slug),
    general: p.configured ? p.general : true,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
