import { dayKeyOf, timeOf } from "./dates";
import { HOUSE_NONE, type EventFormValues } from "./validation";

export function eventToFormValues(e: {
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
  accessPass: string | null;
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
    houseId: e.houseId ?? HOUSE_NONE,
    venueId: e.venueId,
    customLocation: e.customLocation ?? "",
    audience: e.audience,
    spaceImpact: e.spaceImpact,
    restrictionNote: e.restrictionNote ?? "",
    accessPass: e.accessPass ?? "",
    organiserName: e.organiserName,
    contactEmail: e.contactEmail,
    registrationUrl: e.registrationUrl ?? "",
    imageUrl: e.imageUrl ?? "",
    recurrence: e.recurrence,
    recurrenceEnd: e.recurrenceEnd ? dayKeyOf(e.recurrenceEnd) : "",
  };
}
