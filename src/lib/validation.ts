import { z } from "zod";
import {
  dayKeyOf,
  diffDays,
  isDateKey,
  isTimeString,
  parseLocalDateTime,
} from "./dates";
import { contrastRatio, isHexColor, MIN_TEXT_CONTRAST } from "./contrast";

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 400;
export const MAX_RECURRENCE_DAYS = 366;
export const NOTE_MAX = 200;
/** Form value of "Outside the houses": the event belongs to no house. */
export const HOUSE_NONE = "none";

/** Error keys are translated in the UI (messages.errors). */
export type ErrorKey =
  | "required"
  | "title_short"
  | "title_long"
  | "description_short"
  | "description_long"
  | "date_invalid"
  | "date_past"
  | "time_invalid"
  | "end_before_start"
  | "email_invalid"
  | "url_invalid"
  | "image_invalid"
  | "custom_location_required"
  | "custom_location_long"
  | "organiser_short"
  | "organiser_long"
  | "recurrence_end_required"
  | "recurrence_end_before_start"
  | "recurrence_end_too_far"
  | "colour_invalid"
  | "contrast_low"
  | "reason_short"
  | "house_required"
  | "house_only_needs_house"
  | "note_long"
  | "venue_house_mismatch"
  | "invalid";

export type EventField =
  | "title"
  | "categoryId"
  | "description"
  | "date"
  | "startTime"
  | "endTime"
  | "houseId"
  | "venueId"
  | "customLocation"
  | "audience"
  | "spaceImpact"
  | "restrictionNote"
  | "organiserName"
  | "contactEmail"
  | "registrationUrl"
  | "imageUrl"
  | "recurrence"
  | "recurrenceEnd";

export type EventFormValues = {
  title: string;
  categoryId: string;
  description: string;
  date: string; // YYYY-MM-DD (Europe/Paris)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  /** House id, or HOUSE_NONE for an event outside the houses, or "" while unchosen. */
  houseId: string;
  venueId: string;
  customLocation: string;
  audience: "RESIDENTS_ONLY" | "PUBLIC" | "HOUSE_ONLY";
  spaceImpact: "NONE" | "LIMITED" | "CLOSED";
  restrictionNote: string;
  organiserName: string;
  contactEmail: string;
  registrationUrl: string;
  imageUrl: string;
  recurrence: "NONE" | "WEEKLY" | "MONTHLY";
  recurrenceEnd: string; // YYYY-MM-DD or ""
};

export type EventData = {
  title: string;
  categoryId: string;
  description: string;
  startAt: Date;
  endAt: Date;
  houseId: string | null;
  venueId: string;
  customLocation: string | null;
  audience: "RESIDENTS_ONLY" | "PUBLIC" | "HOUSE_ONLY";
  spaceImpact: "NONE" | "LIMITED" | "CLOSED";
  restrictionNote: string | null;
  organiserName: string;
  contactEmail: string;
  registrationUrl: string | null;
  imageUrl: string | null;
  recurrence: "NONE" | "WEEKLY" | "MONTHLY";
  recurrenceEnd: Date | null;
};

export type EventErrors = Partial<Record<EventField, ErrorKey>>;

export type ValidationOptions = {
  /** "draft" tolerates an incomplete form; "submit" is what goes to the review queue. */
  mode: "draft" | "submit";
  /** Current time, injectable for tests. */
  now?: Date;
  /** Admins may edit events that already took place. */
  allowPast?: boolean;
  /** Venues flagged "Other" require a custom location. */
  otherVenueIds?: string[];
  /** Maps each venue id to the house it belongs to (null = generic space, usable in any house). */
  venueHouse?: Record<string, string | null>;
};

const s = (max: number) => z.string().max(max, "invalid").default("");

const eventShape = z.object({
  title: s(300),
  categoryId: s(100),
  description: s(2000),
  date: s(20),
  startTime: s(10),
  endTime: s(10),
  houseId: s(100),
  venueId: s(100),
  customLocation: s(500),
  audience: z.enum(["RESIDENTS_ONLY", "PUBLIC", "HOUSE_ONLY"], "invalid"),
  spaceImpact: z.enum(["NONE", "LIMITED", "CLOSED"], "invalid").default("NONE"),
  restrictionNote: s(2000),
  organiserName: s(300),
  contactEmail: s(320),
  registrationUrl: s(1000),
  imageUrl: s(1000),
  recurrence: z.enum(["NONE", "WEEKLY", "MONTHLY"], "invalid").default("NONE"),
  recurrenceEnd: s(20),
});

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

/** Uploaded images live under /uploads/ (local disk) or on Vercel Blob. */
export function isAllowedImageUrl(value: string): boolean {
  if (/^\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/i.test(value);
}

export type EventValidation =
  | { ok: true; data: EventData }
  | { ok: false; errors: EventErrors };

export function validateEvent(input: unknown, options: ValidationOptions): EventValidation {
  const now = options.now ?? new Date();
  const submit = options.mode === "submit";
  const errors: EventErrors = {};
  const fail = (field: EventField, key: ErrorKey) => {
    if (!errors[field]) errors[field] = key;
  };

  const parsed = eventShape.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as EventField | undefined;
      if (field) fail(field, "invalid");
    }
    return { ok: false, errors };
  }
  const raw = parsed.data;
  const v = {
    ...raw,
    title: raw.title.trim(),
    description: raw.description.trim(),
    customLocation: raw.customLocation.trim(),
    restrictionNote: raw.restrictionNote.trim(),
    organiserName: raw.organiserName.trim(),
    contactEmail: raw.contactEmail.trim(),
    registrationUrl: raw.registrationUrl.trim(),
    imageUrl: raw.imageUrl.trim(),
    date: raw.date.trim(),
    startTime: raw.startTime.trim(),
    endTime: raw.endTime.trim(),
    recurrenceEnd: raw.recurrenceEnd.trim(),
  };

  // The event
  if (!v.title) fail("title", "required");
  else if (v.title.length < 3) fail("title", "title_short");
  else if (v.title.length > TITLE_MAX) fail("title", "title_long");

  if (!v.categoryId) fail("categoryId", "required");

  if (v.description.length > DESCRIPTION_MAX) fail("description", "description_long");
  else if (submit && !v.description) fail("description", "required");
  else if (submit && v.description.length < 10) fail("description", "description_short");

  // When and where
  let startAt: Date | null = null;
  let endAt: Date | null = null;
  if (!v.date) fail("date", "required");
  else if (!isDateKey(v.date)) fail("date", "date_invalid");

  if (!v.startTime) fail("startTime", "required");
  else if (!isTimeString(v.startTime)) fail("startTime", "time_invalid");
  if (!v.endTime) fail("endTime", "required");
  else if (!isTimeString(v.endTime)) fail("endTime", "time_invalid");

  if (!errors.date && !errors.startTime) startAt = parseLocalDateTime(v.date, v.startTime);
  if (!errors.date && !errors.endTime) endAt = parseLocalDateTime(v.date, v.endTime);

  if (startAt && endAt && endAt <= startAt) fail("endTime", "end_before_start");

  if (startAt && !options.allowPast && startAt < now) {
    // Whole day in the past -> flag the date; same day but time already passed -> flag the time.
    fail(v.date < dayKeyOf(now) ? "date" : "startTime", "date_past");
  }

  if (!v.houseId) fail("houseId", "house_required");
  if (!v.venueId) fail("venueId", "required");
  else if (v.houseId && options.venueHouse && v.venueId in options.venueHouse) {
    // A space belongs to one house, or to none (generic "Other").
    const owner = options.venueHouse[v.venueId];
    if (owner && owner !== v.houseId) fail("venueId", "venue_house_mismatch");
  }
  if (v.audience === "HOUSE_ONLY" && v.houseId === HOUSE_NONE) fail("audience", "house_only_needs_house");
  if (v.restrictionNote.length > NOTE_MAX) fail("restrictionNote", "note_long");
  if (v.customLocation.length > 120) fail("customLocation", "custom_location_long");
  else if (submit && v.venueId && options.otherVenueIds?.includes(v.venueId) && !v.customLocation) {
    fail("customLocation", "custom_location_required");
  }

  // Audience and organiser
  if (submit) {
    if (!v.organiserName) fail("organiserName", "required");
    else if (v.organiserName.length < 2) fail("organiserName", "organiser_short");
    else if (v.organiserName.length > 100) fail("organiserName", "organiser_long");
    if (!v.contactEmail) fail("contactEmail", "required");
  } else if (v.organiserName.length > 100) {
    fail("organiserName", "organiser_long");
  }
  if (v.contactEmail && !isEmail(v.contactEmail)) fail("contactEmail", "email_invalid");
  if (v.registrationUrl && !isHttpUrl(v.registrationUrl)) fail("registrationUrl", "url_invalid");
  if (v.imageUrl && !isAllowedImageUrl(v.imageUrl)) fail("imageUrl", "image_invalid");

  // Recurrence
  let recurrenceEnd: Date | null = null;
  if (v.recurrence !== "NONE") {
    if (!v.recurrenceEnd) fail("recurrenceEnd", "recurrence_end_required");
    else if (!isDateKey(v.recurrenceEnd)) fail("recurrenceEnd", "date_invalid");
    else if (isDateKey(v.date)) {
      if (v.recurrenceEnd < v.date) fail("recurrenceEnd", "recurrence_end_before_start");
      else if (diffDays(v.date, v.recurrenceEnd) > MAX_RECURRENCE_DAYS) {
        fail("recurrenceEnd", "recurrence_end_too_far");
      } else {
        // Stored as the start of the last allowed day: occurrences on that day are included.
        recurrenceEnd = parseLocalDateTime(v.recurrenceEnd, "00:00");
      }
    }
  }

  if (Object.keys(errors).length > 0 || !startAt || !endAt) return { ok: false, errors };

  return {
    ok: true,
    data: {
      title: v.title,
      categoryId: v.categoryId,
      description: v.description,
      startAt,
      endAt,
      houseId: v.houseId === HOUSE_NONE ? null : v.houseId,
      venueId: v.venueId,
      customLocation: v.customLocation || null,
      audience: v.audience,
      spaceImpact: v.spaceImpact,
      restrictionNote: v.restrictionNote || null,
      organiserName: v.organiserName,
      contactEmail: v.contactEmail,
      registrationUrl: v.registrationUrl || null,
      imageUrl: v.imageUrl || null,
      recurrence: v.recurrence,
      recurrenceEnd,
    },
  };
}

// ---- Other schemas ----------------------------------------------------------

export const rejectionSchema = z.object({
  eventId: z.string().min(1),
  reason: z.string().trim().min(3, "reason_short").max(500, "invalid"),
});

export const emailSchema = z.string().trim().toLowerCase().max(254).refine(isEmail, "email_invalid");

export const categorySchema = z
  .object({
    nameFr: z.string().trim().min(1, "required").max(60, "invalid"),
    nameEn: z.string().trim().min(1, "required").max(60, "invalid"),
    color: z.string().trim().refine(isHexColor, "colour_invalid"),
    bgColor: z.string().trim().refine(isHexColor, "colour_invalid"),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .superRefine((v, ctx) => {
    if (isHexColor(v.color) && isHexColor(v.bgColor) && contrastRatio(v.color, v.bgColor) < MIN_TEXT_CONTRAST) {
      ctx.addIssue({ code: "custom", path: ["color"], message: "contrast_low" });
    }
  });

export const venueSchema = z.object({
  houseId: z.string().max(100).default(""),
  nameFr: z.string().trim().min(1, "required").max(80, "invalid"),
  nameEn: z.string().trim().min(1, "required").max(80, "invalid"),
  isOther: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const houseSchema = z.object({
  nameFr: z.string().trim().min(1, "required").max(80, "invalid"),
  nameEn: z.string().trim().min(1, "required").max(80, "invalid"),
  isResidence: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
