import { addDaysToKey, dayKeyOf, parseLocalDateTime, timeOf, diffDays, TIMEZONE } from "./dates";
import type { Recurrence } from "./types";

export type IcsEvent = {
  id: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  location: string;
  categoryName?: string;
  organiserName: string;
  audienceLabel?: string;
  url: string;
  recurrence: Recurrence;
  recurrenceEnd: Date | null;
  updatedAt: Date;
};

export type IcsOptions = {
  calendarName: string;
  /** Used to build stable UIDs (e.g. "events.ciup.fr"). */
  domain: string;
  now?: Date;
  /** Export a single occurrence (YYYY-MM-DD) of a recurring event, without RRULE. */
  occurrenceDate?: string;
};

const CRLF = "\r\n";

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line at 75 octets (RFC 5545 3.1), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74; // continuation lines start with a space
    }
    current += ch;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join(CRLF + " ");
}

const p2 = (n: number) => String(n).padStart(2, "0");

export function formatUtc(date: Date): string {
  return (
    `${date.getUTCFullYear()}${p2(date.getUTCMonth() + 1)}${p2(date.getUTCDate())}` +
    `T${p2(date.getUTCHours())}${p2(date.getUTCMinutes())}${p2(date.getUTCSeconds())}Z`
  );
}

/** Wall-clock Europe/Paris, "YYYYMMDDTHHmmss". */
export function formatLocal(date: Date): string {
  return `${dayKeyOf(date).replace(/-/g, "")}T${timeOf(date).replace(":", "")}00`;
}

const VTIMEZONE_PARIS = [
  "BEGIN:VTIMEZONE",
  `TZID:${TIMEZONE}`,
  "BEGIN:STANDARD",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
];

function eventLines(e: IcsEvent, opts: IcsOptions, stamp: Date): string[] {
  let start = e.startAt;
  let end = e.endAt;
  let recurrence = e.recurrence;

  if (opts.occurrenceDate) {
    const key = dayKeyOf(e.startAt);
    const shift = diffDays(key, opts.occurrenceDate);
    const endShift = diffDays(key, dayKeyOf(e.endAt));
    start = parseLocalDateTime(addDaysToKey(key, shift), timeOf(e.startAt)) ?? start;
    end = parseLocalDateTime(addDaysToKey(key, shift + endShift), timeOf(e.endAt)) ?? end;
    recurrence = "NONE";
  }

  const descriptionParts = [e.description];
  descriptionParts.push(`${e.organiserName}${e.audienceLabel ? ` - ${e.audienceLabel}` : ""}`);
  descriptionParts.push(e.url);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.id}@${opts.domain}`,
    `DTSTAMP:${formatUtc(stamp)}`,
    `LAST-MODIFIED:${formatUtc(e.updatedAt)}`,
    `DTSTART;TZID=${TIMEZONE}:${formatLocal(start)}`,
    `DTEND;TZID=${TIMEZONE}:${formatLocal(end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(descriptionParts.filter(Boolean).join("\n\n"))}`,
  ];
  if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
  if (e.categoryName) lines.push(`CATEGORIES:${escapeText(e.categoryName)}`);
  lines.push(`URL:${e.url}`, "STATUS:CONFIRMED", "TRANSP:OPAQUE");

  if (recurrence !== "NONE" && e.recurrenceEnd) {
    const freq = recurrence === "WEEKLY" ? "WEEKLY" : "MONTHLY";
    // UNTIL is expressed in UTC: the very end of the last allowed day in Paris.
    const until = parseLocalDateTime(addDaysToKey(dayKeyOf(e.recurrenceEnd), 1), "00:00")!;
    lines.push(`RRULE:FREQ=${freq};UNTIL=${formatUtc(new Date(until.getTime() - 1000))}`);
  }
  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar(events: IcsEvent[], opts: IcsOptions): string {
  const stamp = opts.now ?? new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CIUP//Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.calendarName)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...VTIMEZONE_PARIS,
    ...events.flatMap((e) => eventLines(e, opts, stamp)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}
