import { describe, expect, it } from "vitest";
import { validateEvent, type EventFormValues } from "@/lib/validation";
import { contrastRatio } from "@/lib/contrast";
import { categorySchema } from "@/lib/validation";

// Wednesday 18 November 2026, 10:00 in Paris (09:00 UTC).
const NOW = new Date("2026-11-18T09:00:00Z");

const valid: EventFormValues = {
  title: "Soirée jeux de société",
  categoryId: "cat1",
  description: "Venez jouer avec les résidents de toutes les maisons.",
  date: "2026-11-25",
  startTime: "19:00",
  endTime: "21:30",
  venueId: "venue1",
  customLocation: "",
  audience: "RESIDENTS_ONLY",
  organiserName: "Maison du Japon",
  contactEmail: "events@example.org",
  registrationUrl: "",
  imageUrl: "",
  recurrence: "NONE",
  recurrenceEnd: "",
};

const submit = (patch: Partial<EventFormValues>, extra = {}) =>
  validateEvent({ ...valid, ...patch }, { mode: "submit", now: NOW, ...extra });

describe("validateEvent (submit)", () => {
  it("accepts a valid event and converts Paris wall-clock times to UTC instants", () => {
    const r = submit({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 19:00 CET (UTC+1) on 25 Nov
      expect(r.data.startAt.toISOString()).toBe("2026-11-25T18:00:00.000Z");
      expect(r.data.endAt.toISOString()).toBe("2026-11-25T20:30:00.000Z");
      expect(r.data.registrationUrl).toBeNull();
      expect(r.data.customLocation).toBeNull();
    }
  });

  it("handles daylight saving time (CEST, UTC+2)", () => {
    const r = submit({ date: "2027-06-10", startTime: "19:00", endTime: "20:00" });
    expect(r.ok && r.data.startAt.toISOString()).toBe("2027-06-10T17:00:00.000Z");
  });

  it("requires the end to be after the start", () => {
    for (const endTime of ["19:00", "18:59"]) {
      const r = submit({ endTime });
      expect(!r.ok && r.errors.endTime).toBe("end_before_start");
    }
  });

  it("rejects dates in the past", () => {
    const r = submit({ date: "2026-11-17" });
    expect(!r.ok && r.errors.date).toBe("date_past");
  });

  it("rejects a start time that has already passed today, on the time field", () => {
    const r = submit({ date: "2026-11-18", startTime: "09:00", endTime: "11:00" });
    expect(!r.ok && r.errors.startTime).toBe("date_past");
  });

  it("allows past dates for admins (allowPast)", () => {
    expect(submit({ date: "2026-01-05" }, { allowPast: true }).ok).toBe(true);
  });

  it("rejects impossible calendar dates and malformed times", () => {
    expect(!submit({ date: "2026-02-31" }).ok).toBe(true);
    const r = submit({ date: "2026-02-31", startTime: "25:00" });
    expect(!r.ok && r.errors.date).toBe("date_invalid");
    expect(!r.ok && r.errors.startTime).toBe("time_invalid");
  });

  it("validates contact email and registration URL", () => {
    const r = submit({ contactEmail: "not-an-email", registrationUrl: "javascript:alert(1)" });
    expect(!r.ok && r.errors.contactEmail).toBe("email_invalid");
    expect(!r.ok && r.errors.registrationUrl).toBe("url_invalid");
    expect(submit({ registrationUrl: "https://example.org/register" }).ok).toBe(true);
    expect(!submit({ registrationUrl: "example.org" }).ok).toBe(true);
  });

  it("enforces the 400 character description limit", () => {
    expect(submit({ description: "x".repeat(400) }).ok).toBe(true);
    const r = submit({ description: "x".repeat(401) });
    expect(!r.ok && r.errors.description).toBe("description_long");
  });

  it("requires a custom location for venues flagged Other", () => {
    const r = submit({ venueId: "other" }, { otherVenueIds: ["other"] });
    expect(!r.ok && r.errors.customLocation).toBe("custom_location_required");
    expect(submit({ venueId: "other", customLocation: "Parc Montsouris" }, { otherVenueIds: ["other"] }).ok).toBe(true);
  });

  it("only accepts uploaded image URLs", () => {
    expect(submit({ imageUrl: "/uploads/abc-123.png" }).ok).toBe(true);
    const r = submit({ imageUrl: "https://tracker.example/pixel.gif" });
    expect(!r.ok && r.errors.imageUrl).toBe("image_invalid");
  });

  describe("recurrence", () => {
    it("requires an end date for repeating events", () => {
      const r = submit({ recurrence: "WEEKLY" });
      expect(!r.ok && r.errors.recurrenceEnd).toBe("recurrence_end_required");
    });
    it("rejects an end date before the first occurrence or more than a year away", () => {
      const before = submit({ recurrence: "WEEKLY", recurrenceEnd: "2026-11-20" });
      expect(!before.ok && before.errors.recurrenceEnd).toBe("recurrence_end_before_start");
      const far = submit({ recurrence: "MONTHLY", recurrenceEnd: "2028-01-01" });
      expect(!far.ok && far.errors.recurrenceEnd).toBe("recurrence_end_too_far");
    });
    it("accepts a valid series and ignores recurrenceEnd for one-off events", () => {
      const ok = submit({ recurrence: "WEEKLY", recurrenceEnd: "2026-12-30" });
      expect(ok.ok && ok.data.recurrenceEnd?.toISOString()).toBe("2026-12-29T23:00:00.000Z");
      const none = submit({ recurrence: "NONE", recurrenceEnd: "2026-12-30" });
      expect(none.ok && none.data.recurrenceEnd).toBeNull();
    });
  });
});

describe("validateEvent (draft)", () => {
  const draft = (patch: Partial<EventFormValues>) =>
    validateEvent({ ...valid, ...patch }, { mode: "draft", now: NOW });

  it("tolerates a missing description, organiser and contact email", () => {
    expect(draft({ description: "", organiserName: "", contactEmail: "" }).ok).toBe(true);
  });
  it("still requires the fields needed to store the event", () => {
    const r = draft({ title: "", date: "", venueId: "" });
    expect(!r.ok && r.errors.title).toBe("required");
    expect(!r.ok && r.errors.date).toBe("required");
    expect(!r.ok && r.errors.venueId).toBe("required");
  });
  it("still validates what was filled in", () => {
    const r = draft({ contactEmail: "nope", description: "y".repeat(500) });
    expect(!r.ok && r.errors.contactEmail).toBe("email_invalid");
    expect(!r.ok && r.errors.description).toBe("description_long");
  });
});

describe("categorySchema", () => {
  it("rejects colour pairs below 4.5:1", () => {
    const r = categorySchema.safeParse({ nameFr: "A", nameEn: "A", color: "#999999", bgColor: "#FFFFFF" });
    expect(r.success).toBe(false);
  });
  it("accepts the design colours", () => {
    for (const [c, bg] of [
      ["#6B2F8A", "#F3ECF8"],
      ["#1C6542", "#E5F2EA"],
      ["#1E4F8A", "#E7EEF8"],
      ["#8A4210", "#FBEBDF"],
      ["#8A1F45", "#F8E8EE"],
    ]) {
      expect(contrastRatio(c, bg)).toBeGreaterThanOrEqual(4.5);
      expect(categorySchema.safeParse({ nameFr: "A", nameEn: "A", color: c, bgColor: bg }).success).toBe(true);
    }
  });
});
