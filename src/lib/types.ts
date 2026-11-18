// Plain string unions mirroring the Prisma enums, safe to import from client components.
/** HOUSE_ONLY = only residents of the house that hosts the event. */
export type Audience = "RESIDENTS_ONLY" | "PUBLIC" | "HOUSE_ONLY";
/** What the event does to its space for everybody else. */
export type SpaceImpact = "NONE" | "LIMITED" | "CLOSED";
export type Recurrence = "NONE" | "WEEKLY" | "MONTHLY";
export type EventStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
export type Role = "ORGANISER" | "ADMIN";
export type Locale = "fr" | "en";

export const LOCALES: Locale[] = ["fr", "en"];
export const DEFAULT_LOCALE: Locale = "fr";
export const EVENT_STATUSES: EventStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED"];

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}
