"use client";

import { useMemo } from "react";
import { addDaysToKey, weekdayLabels, formatDayLong, type GridDay } from "@/lib/dates";
import { useI18n, usePlural } from "@/lib/i18n/client";
import type { CalendarEvent, CategoryView } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  days: GridDay[];
  eventsByDay: Map<string, CalendarEvent[]>;
  categories: Map<string, CategoryView>;
  selectedDay: string;
  todayKey: string;
  busy: boolean;
  onSelect: (key: string) => void;
};

const MAX_CHIPS = 2;

export function MonthGrid({ label, days, eventsByDay, categories, selectedDay, todayKey, busy, onSelect }: Props) {
  const { locale, t } = useI18n();
  const plural = usePlural();
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const weeks = useMemo(() => {
    const rows: GridDay[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [days]);

  const keys = useMemo(() => new Set(days.map((d) => d.key)), [days]);
  // Roving tabindex: exactly one day button is in the tab order.
  const tabStop = keys.has(selectedDay) ? selectedDay : days.find((d) => d.inMonth)?.key;

  const onKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
    const current = (e.target as HTMLElement).closest<HTMLElement>("[data-day]")?.dataset.day;
    if (!current) return;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string | undefined;
    if (e.key in moves) target = addDaysToKey(current, moves[e.key]);
    else if (e.key === "Home" || e.key === "End") {
      const index = days.findIndex((d) => d.key === current);
      const rowStart = index - (index % 7);
      target = days[e.key === "Home" ? rowStart : rowStart + 6]?.key;
    }
    if (!target || !keys.has(target)) return;
    e.preventDefault();
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${target}"]`)?.focus();
  };

  return (
    <div className="card overflow-hidden" aria-busy={busy}>
      <table
        role="grid"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cn("w-full table-fixed border-separate border-spacing-0 transition-opacity", busy && "opacity-60")}
      >
        <thead>
          <tr>
            {weekdays.map((d) => (
              <th
                key={d.long}
                scope="col"
                abbr={d.long}
                className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted sm:text-sm"
              >
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0].key}>
              {week.map((day, col) => {
                const events = eventsByDay.get(day.key) ?? [];
                const isToday = day.key === todayKey;
                const isSelected = day.key === selectedDay;
                const dayNumber = Number(day.key.slice(8));
                const date = formatDayLong(day.key, locale);
                const name = events.length
                  ? plural(t.calendar as unknown as Record<string, string>, "dayWithCount", events.length, { date })
                  : t.calendar.dayNoEvents.replace("{date}", date);
                const extra = events.length - MAX_CHIPS;

                return (
                  <td
                    key={day.key}
                    className={cn("h-[60px] border-t border-line p-0 align-top sm:h-[112px]", col > 0 && "border-l", !day.inMonth && "bg-bg")}
                  >
                    <button
                      type="button"
                      data-day={day.key}
                      tabIndex={day.key === tabStop ? 0 : -1}
                      aria-pressed={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => onSelect(day.key)}
                      className={cn(
                        "flex h-full min-h-[60px] w-full min-w-0 flex-col items-stretch gap-1 p-1 text-left sm:min-h-[112px] sm:p-2",
                        "hover:bg-accent-soft focus-visible:outline-offset-[-2px]",
                        isSelected && "outline outline-2 -outline-offset-2 outline-accent",
                      )}
                    >
                      <span className="sr-only">{name}</span>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center self-center rounded-full text-sm font-semibold sm:self-start",
                          isToday ? "bg-accent text-white" : day.inMonth ? "text-ink" : "text-muted",
                        )}
                        aria-hidden="true"
                      >
                        {dayNumber}
                      </span>

                      {/* Phones: colour dots. From sm: colour-coded chips. */}
                      {events.length > 0 && (
                        <span className="flex flex-wrap justify-center gap-1 sm:hidden" aria-hidden="true">
                          {events.slice(0, 3).map((e) => (
                            <span
                              key={e.key}
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: categories.get(e.categorySlug)?.color ?? "#55574F" }}
                            />
                          ))}
                        </span>
                      )}
                      <span className="hidden min-w-0 flex-col gap-1 sm:flex" aria-hidden="true">
                        {events.slice(0, MAX_CHIPS).map((e) => {
                          const c = categories.get(e.categorySlug);
                          return (
                            <span
                              key={e.key}
                              className={cn("block truncate rounded-md px-1.5 py-0.5 text-xs font-semibold", !day.inMonth && "opacity-90")}
                              style={{ color: c?.color ?? "#16181D", backgroundColor: c?.bgColor ?? "#ECECE6" }}
                            >
                              {e.title}
                            </span>
                          );
                        })}
                        {extra > 0 && (
                          <span className="px-1.5 text-xs font-semibold text-muted">
                            {t.calendar.more.replace("{count}", String(extra))}
                          </span>
                        )}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
