"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin, assertUser, canManageEvent, ForbiddenError, type CurrentUser } from "@/lib/permissions";
import { validateEvent, type EventErrors, type EventFormValues } from "@/lib/validation";
import { approvedEmail } from "@/lib/email-templates";
import { sendMailSafely } from "@/lib/email";
import type { EventStatus } from "@/lib/types";

export type SaveIntent = "draft" | "submit" | "save" | "publish";
export type SaveResult =
  | { ok: true; id: string; status: EventStatus }
  | { ok: false; errors?: EventErrors; error?: "forbidden" | "not_found" | "generic" };

function revalidateEvent(id?: string) {
  revalidatePath("/");
  revalidatePath("/my-events");
  revalidatePath("/admin");
  if (id) revalidatePath(`/events/${id}`);
}

/**
 * Creates or updates an event. All authorisation happens here, on the server:
 *  - organisers can only touch their own events and can only produce DRAFT or PENDING;
 *  - "save" and "publish" are admin-only and may edit past events.
 */
export async function saveEventAction(input: {
  id?: string;
  intent: SaveIntent;
  values: EventFormValues;
}): Promise<SaveResult> {
  let user: CurrentUser;
  try {
    user = input.intent === "save" || input.intent === "publish" ? await assertAdmin() : await assertUser();
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: "forbidden" };
    throw error;
  }
  if (!["draft", "submit", "save", "publish"].includes(input.intent)) return { ok: false, error: "generic" };
  const adminEdit = input.intent === "save" || input.intent === "publish";
  if (adminEdit && !input.id) return { ok: false, error: "generic" };

  const existing = input.id ? await db.event.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) return { ok: false, error: "not_found" };
  if (existing && !canManageEvent(user, existing)) return { ok: false, error: "forbidden" };
  // Organisers cannot silently unpublish a live event into a draft: they resubmit it for review.
  if (existing?.status === "PUBLISHED" && input.intent === "draft") return { ok: false, error: "forbidden" };

  const [categories, venues] = await Promise.all([
    db.category.findMany({ select: { id: true } }),
    db.venue.findMany({ select: { id: true, isOther: true } }),
  ]);

  // "Save" on a draft keeps it a draft, so it stays lenient; everything that leads towards
  // publication (submit, publish, save on a non-draft) is validated in full.
  const lenient = input.intent === "draft" || (input.intent === "save" && existing?.status === "DRAFT");
  const result = validateEvent(input.values, {
    mode: lenient ? "draft" : "submit",
    allowPast: adminEdit,
    otherVenueIds: venues.filter((v) => v.isOther).map((v) => v.id),
  });
  if (!result.ok) return { ok: false, errors: result.errors };

  const errors: EventErrors = {};
  if (!categories.some((c) => c.id === result.data.categoryId)) errors.categoryId = "invalid";
  if (!venues.some((v) => v.id === result.data.venueId)) errors.venueId = "invalid";
  if (Object.keys(errors).length) return { ok: false, errors };

  const status: EventStatus =
    input.intent === "draft" ? "DRAFT" : input.intent === "submit" ? "PENDING" : input.intent === "publish" ? "PUBLISHED" : existing!.status;

  const data = {
    ...result.data,
    status,
    ...(input.intent === "submit" || input.intent === "draft" ? { rejectionReason: null, reviewedAt: null } : {}),
    ...(input.intent === "publish" ? { rejectionReason: null, reviewedAt: new Date() } : {}),
  };

  const saved = existing
    ? await db.event.update({ where: { id: existing.id }, data })
    : await db.event.create({ data: { ...data, createdById: user.id } });

  // Remember the organisation so the next form is pre-filled.
  if (!adminEdit && !user.organisation && result.data.organiserName) {
    await db.user.update({ where: { id: user.id }, data: { organisation: result.data.organiserName } });
  }

  if (input.intent === "publish" && existing?.status !== "PUBLISHED") {
    const owner = await db.user.findUnique({ where: { id: saved.createdById }, select: { email: true } });
    if (owner) await sendMailSafely(approvedEmail(owner.email, saved));
  }

  revalidateEvent(saved.id);
  return { ok: true, id: saved.id, status: saved.status };
}

export async function deleteEventAction(id: string): Promise<{ ok: boolean }> {
  let user: CurrentUser;
  try {
    user = await assertUser();
  } catch {
    return { ok: false };
  }
  const event = await db.event.findUnique({ where: { id }, select: { id: true, createdById: true } });
  if (!event || !canManageEvent(user, event)) return { ok: false };
  await db.event.delete({ where: { id } });
  revalidateEvent(id);
  return { ok: true };
}
