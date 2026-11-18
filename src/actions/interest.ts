"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/permissions";
import { ensureDeviceId, getDeviceId } from "@/lib/device";

export type ToggleResult = { ok: true; interested: boolean } | { ok: false };

/**
 * Toggles "I'm interested" for the signed-in user, or for the anonymous device cookie
 * if the visitor is not signed in. Only published events can be bookmarked.
 */
export async function toggleInterestAction(eventId: string): Promise<ToggleResult> {
  if (typeof eventId !== "string" || eventId.length > 64) return { ok: false };
  const event = await db.event.findFirst({ where: { id: eventId, status: "PUBLISHED" }, select: { id: true } });
  if (!event) return { ok: false };

  const user = await getCurrentUser();
  const deviceId = user ? await getDeviceId() : await ensureDeviceId();

  const owners = [
    ...(user ? [{ userId: user.id }] : []),
    ...(deviceId ? [{ deviceId }] : []),
  ];
  const existing = await db.interest.findFirst({ where: { eventId, OR: owners } });

  let interested: boolean;
  if (existing) {
    // Remove every row for this person (user row and any earlier anonymous row).
    await db.interest.deleteMany({ where: { eventId, OR: owners } });
    interested = false;
  } else {
    try {
      await db.interest.create({
        data: { eventId, ...(user ? { userId: user.id } : { deviceId: deviceId! }) },
      });
    } catch {
      // Unique constraint hit by a concurrent request: the interest already exists.
    }
    interested = true;
  }

  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);
  return { ok: true, interested };
}
