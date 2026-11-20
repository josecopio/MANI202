"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/permissions";
import { approvedEmail, rejectedEmail } from "@/lib/email-templates";
import { sendMailSafely } from "@/lib/email";
import { categorySchema, houseSchema, rejectionSchema, slugify, venueSchema, type ErrorKey } from "@/lib/validation";

export type AdminResult = { ok: boolean; error?: ErrorKey | "forbidden" | "in_use" | "not_found"; fields?: Record<string, ErrorKey> };

async function admin(): Promise<boolean> {
  try {
    await assertAdmin();
    return true;
  } catch {
    return false;
  }
}

function refresh() {
  revalidatePath("/calendar", "layout");
  revalidatePath("/admin");
  revalidatePath("/submit");
}

// ---- Review queue -------------------------------------------------------------------

export async function approveEventAction(eventId: string): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  const event = await db.event.findUnique({ where: { id: eventId }, include: { createdBy: { select: { email: true } } } });
  if (!event) return { ok: false, error: "not_found" };
  await db.event.update({
    where: { id: eventId },
    data: { status: "PUBLISHED", rejectionReason: null, reviewedAt: new Date() },
  });
  await sendMailSafely(approvedEmail(event.createdBy.email, event));
  refresh();
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function rejectEventAction(eventId: string, reason: string): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  const parsed = rejectionSchema.safeParse({ eventId, reason });
  if (!parsed.success) return { ok: false, fields: { reason: "reason_short" } };
  const event = await db.event.findUnique({ where: { id: eventId }, include: { createdBy: { select: { email: true } } } });
  if (!event) return { ok: false, error: "not_found" };
  await db.event.update({
    where: { id: eventId },
    data: { status: "REJECTED", rejectionReason: parsed.data.reason, reviewedAt: new Date() },
  });
  await sendMailSafely(rejectedEmail(event.createdBy.email, event, parsed.data.reason));
  refresh();
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

// ---- Categories ---------------------------------------------------------------------

function categoryInput(formData: FormData) {
  return categorySchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    color: formData.get("color"),
    bgColor: formData.get("bgColor"),
    sortOrder: formData.get("sortOrder") ?? 0,
  });
}

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, ErrorKey> {
  const out: Record<string, ErrorKey> = {};
  for (const i of error.issues) out[String(i.path[0])] ??= i.message as ErrorKey;
  return out;
}

export async function saveCategoryAction(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  const parsed = categoryInput(formData);
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };
  const id = String(formData.get("id") ?? "");

  if (id) {
    await db.category.update({ where: { id }, data: parsed.data });
  } else {
    const base = slugify(parsed.data.nameEn) || "category";
    let slug = base;
    for (let n = 2; await db.category.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    await db.category.create({ data: { ...parsed.data, slug } });
  }
  refresh();
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  if ((await db.event.count({ where: { categoryId: id } })) > 0) return { ok: false, error: "in_use" };
  await db.category.delete({ where: { id } }).catch(() => undefined);
  refresh();
  return { ok: true };
}

// ---- Venues -----------------------------------------------------------------------------

export async function saveVenueAction(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  const parsed = venueSchema.safeParse({
    houseId: formData.get("houseId") ?? "",
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    isOther: formData.get("isOther") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };
  const id = String(formData.get("id") ?? "");
  const { houseId, ...rest } = parsed.data;
  const house = houseId ? await db.house.findUnique({ where: { id: houseId }, select: { id: true } }) : null;
  const data = { ...rest, houseId: house?.id ?? null };
  if (id) await db.venue.update({ where: { id }, data });
  else await db.venue.create({ data });
  refresh();
  return { ok: true };
}

export async function deleteVenueAction(id: string): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  if ((await db.event.count({ where: { venueId: id } })) > 0) return { ok: false, error: "in_use" };
  await db.venue.delete({ where: { id } }).catch(() => undefined);
  refresh();
  return { ok: true };
}

// ---- Houses -----------------------------------------------------------------------------

export async function saveHouseAction(_prev: AdminResult | null, formData: FormData): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  const parsed = houseSchema.safeParse({
    nameFr: formData.get("nameFr"),
    nameEn: formData.get("nameEn"),
    isResidence: formData.get("isResidence") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
  });
  if (!parsed.success) return { ok: false, fields: fieldErrors(parsed.error) };
  const id = String(formData.get("id") ?? "");

  if (id) {
    // The slug is part of residents' saved choices and calendar links: it never changes.
    await db.house.update({ where: { id }, data: parsed.data });
  } else {
    const base = slugify(parsed.data.nameEn) || "house";
    let slug = base;
    for (let n = 2; await db.house.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
    await db.house.create({ data: { ...parsed.data, slug } });
  }
  refresh();
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteHouseAction(id: string): Promise<AdminResult> {
  if (!(await admin())) return { ok: false, error: "forbidden" };
  // Spaces are deleted with their house, so neither the house nor its spaces may have events.
  const used = await db.event.count({ where: { OR: [{ houseId: id }, { venue: { houseId: id } }] } });
  if (used > 0) return { ok: false, error: "in_use" };
  await db.house.delete({ where: { id } }).catch(() => undefined);
  refresh();
  revalidatePath("/calendar");
  return { ok: true };
}
