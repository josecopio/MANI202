import { dayKeyOf, timeOf } from "./dates";
import type { EventFormValues } from "./validation";

export function eventToFormValues(e: {
  title: string;
  categoryId: string;
  description: string;
  startAt: Date;
  endAt: Date;
  venueId: string;
  customLocation: string | null;
  audience: "RESIDENTS_ONLY" | "PUBLIC";
  organiserName: string;
  contactEmail: string;
  registrationUrl: string | null;
  imageUrl: string | null;
  recurrence: "NONE" | "WEEKLY" | "MONTHLY";
  recurrenceEnd: Date | null;
}): EventFormValues {
  return {
    title: e.title,
    categoryId: e.categoryId,
    description: e.description,
    date: dayKeyOf(e.startAt),
    startTime: timeOf(e.startAt),
    endTime: timeOf(e.endAt),
    venueId: e.venueId,
    customLocation: e.customLocation ?? "",
    audience: e.audience,
    organiserName: e.organiserName,
    contactEmail: e.contactEmail,
    registrationUrl: e.registrationUrl ?? "",
    imageUrl: e.imageUrl ?? "",
    recurrence: e.recurrence,
    recurrenceEnd: e.recurrenceEnd ? dayKeyOf(e.recurrenceEnd) : "",
  };
}
