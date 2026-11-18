import { addDaysToKey, dayKeyOf, daysInMonth, diffDays, parseLocalDateTime, timeOf } from "./dates";
import type { Recurrence } from "./types";

export type RecurringEvent = {
  startAt: Date;
  endAt: Date;
  recurrence: Recurrence;
  recurrenceEnd: Date | null;
};

export type Occurrence = { startAt: Date; endAt: Date; dayKey: string };

const MAX_ITERATIONS = 600;

/**
 * Expands an event into its occurrences starting within [from, to).
 *
 * Occurrences keep the same wall-clock time in Europe/Paris across DST changes.
 * Monthly events repeat on the same day of the month and skip months that do not
 * have that day (same semantics as RRULE FREQ=MONTHLY).
 */
export function expandOccurrences(event: RecurringEvent, from: Date, to: Date): Occurrence[] {
  const startKey = dayKeyOf(event.startAt);
  const startTime = timeOf(event.startAt);
  const endTime = timeOf(event.endAt);
  const endDayOffset = diffDays(startKey, dayKeyOf(event.endAt));
  const lastKey =
    event.recurrence === "NONE" || !event.recurrenceEnd ? startKey : dayKeyOf(event.recurrenceEnd);

  const out: Occurrence[] = [];
  const push = (key: string): boolean => {
    const startAt = parseLocalDateTime(key, startTime);
    if (!startAt) return true;
    if (startAt >= to) return false; // beyond the window: stop
    if (startAt >= from) {
      const endAt = parseLocalDateTime(addDaysToKey(key, endDayOffset), endTime) ?? startAt;
      out.push({ startAt, endAt, dayKey: key });
    }
    return true;
  };

  if (event.recurrence === "NONE") {
    push(startKey);
    return out;
  }

  const [y, m, d] = startKey.split("-").map(Number);
  for (let k = 0; k < MAX_ITERATIONS; k++) {
    let key: string;
    if (event.recurrence === "WEEKLY") {
      key = addDaysToKey(startKey, 7 * k);
    } else {
      const idx = y * 12 + (m - 1) + k;
      const yy = Math.floor(idx / 12);
      const mm = (idx % 12) + 1;
      if (d > daysInMonth(yy, mm)) continue; // skip months without that day
      key = `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    if (key > lastKey) break;
    if (!push(key)) break;
  }
  return out;
}
