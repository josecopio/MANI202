import { TZDate } from "@date-fns/tz";
import type { Locale } from "./types";

/** Every date shown or entered in the app is interpreted in the Cité's time zone. */
export const TIMEZONE = "Europe/Paris";

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isDateKey(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** Build the UTC instant of a wall-clock date/time in Europe/Paris. Returns null if invalid. */
export function parseLocalDateTime(dateKey: string, time: string = "00:00"): Date | null {
  if (!isDateKey(dateKey) || !isTimeString(time)) return null;
  const [y, mo, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const tz = new TZDate(y, mo - 1, d, hh, mm, 0, 0, TIMEZONE);
  return new Date(tz.getTime());
}

export function toParis(value: Date | number): TZDate {
  return new TZDate(value instanceof Date ? value.getTime() : value, TIMEZONE);
}

/** YYYY-MM-DD of an instant, in Europe/Paris. */
export function dayKeyOf(value: Date | number): string {
  const d = toParis(value);
  return `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** HH:mm of an instant, in Europe/Paris. */
export function timeOf(value: Date | number): string {
  const d = toParis(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dayKeyOf(now);
}

/** Pure calendar arithmetic on date keys (no time zone involved). */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function diffDays(fromKey: string, toKey: string): number {
  const [y1, m1, d1] = fromKey.split("-").map(Number);
  const [y2, m2, d2] = toKey.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export type MonthRef = { year: number; month: number }; // month is 1-12

export function monthKey({ year, month }: MonthRef): string {
  return `${pad(year, 4)}-${pad(month)}`;
}

export function parseMonthParam(value: string | undefined | null): MonthRef | null {
  if (!value) return null;
  const m = MONTH_RE.exec(value);
  return m ? { year: Number(m[1]), month: Number(m[2]) } : null;
}

export function currentMonth(now: Date = new Date()): MonthRef {
  const d = toParis(now);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthOfKey(key: string): MonthRef {
  const [y, m] = key.split("-").map(Number);
  return { year: y, month: m };
}

export type GridDay = { key: string; inMonth: boolean };

/** Day keys of the month grid, weeks starting on Monday (5 or 6 full weeks). */
export function monthGrid({ year, month }: MonthRef): GridDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const total = Math.ceil((offset + daysInMonth(year, month)) / 7) * 7;
  const firstKey = `${pad(year, 4)}-${pad(month)}-01`;
  const days: GridDay[] = [];
  for (let i = 0; i < total; i++) {
    const key = addDaysToKey(firstKey, i - offset);
    days.push({ key, inMonth: key.startsWith(monthKey({ year, month })) });
  }
  return days;
}

/** [start, end) instants covering the given day keys (inclusive of both ends). */
export function rangeOfDayKeys(firstKey: string, lastKey: string): { start: Date; end: Date } {
  return {
    start: parseLocalDateTime(firstKey, "00:00")!,
    end: parseLocalDateTime(addDaysToKey(lastKey, 1), "00:00")!,
  };
}

export function monthRange(ref: MonthRef): { start: Date; end: Date } {
  const first = `${monthKey(ref)}-01`;
  const last = `${monthKey(ref)}-${pad(daysInMonth(ref.year, ref.month))}`;
  return rangeOfDayKeys(first, last);
}

// ---- Formatting -----------------------------------------------------------

export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-FR" : "en-GB";
}

function keyToNoon(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatTime(value: Date | string | number, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIMEZONE,
  }).format(new Date(value));
}

/** "mercredi 18 novembre 2026" / "Wednesday 18 November 2026" */
export function formatDayLong(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(keyToNoon(key));
}

/** "18 nov." / "18 Nov" */
export function formatDayShort(key: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(keyToNoon(key));
}

export function formatMonthYear(ref: MonthRef, locale: Locale): string {
  const s = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ref.year, ref.month - 1, 1, 12)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdayLabels(locale: Locale): { short: string; long: string }[] {
  // 2026-11-02 is a Monday.
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 10, 2 + i, 12));
    const opts = { timeZone: "UTC" } as const;
    return {
      short: new Intl.DateTimeFormat(intlLocale(locale), { ...opts, weekday: "short" })
        .format(d)
        .replace(/\.$/, ""),
      long: new Intl.DateTimeFormat(intlLocale(locale), { ...opts, weekday: "long" }).format(d),
    };
  });
}
