"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { formatTime, formatDayShort, weekdayLabels } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { CalendarEvent, CategoryView } from "@/lib/queries";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  events: CalendarEvent[];
  categories: Map<string, CategoryView>;
  selectedDay: string;
  busy: boolean;
  onPick: (event: CalendarEvent) => void;
};

export function EventList({ label, events, categories, selectedDay, busy, onPick }: Props) {
  const { locale, t } = useI18n();
  const weekdays = weekdayLabels(locale);

  if (events.length === 0) {
    return (
      <div className="card p-8 text-center" aria-busy={busy}>
        <p className="font-semibold">{t.calendar.listEmpty}</p>
        <p className="mt-1 text-muted">{t.calendar.listEmptyHint}</p>
      </div>
    );
  }

  return (
    <div className={cn("card overflow-hidden transition-opacity", busy && "opacity-60")} aria-busy={busy}>
      <ol aria-label={label} className="divide-y divide-line">
        {events.map((e) => {
          const c = categories.get(e.categorySlug);
          const weekday = weekdays[(new Date(`${e.dayKey}T12:00:00Z`).getUTCDay() + 6) % 7].short;
          return (
            <li key={e.key} className={cn("flex items-stretch", e.dayKey === selectedDay && "bg-accent-soft")}>
              <button
                type="button"
                onClick={() => onPick(e)}
                className="grid min-h-[72px] min-w-0 flex-1 grid-cols-[64px_1fr] items-center gap-x-3 gap-y-1 p-3 text-left hover:bg-accent-soft sm:grid-cols-[88px_72px_1fr_auto] sm:gap-x-4 sm:px-4"
              >
                <span className="text-sm leading-tight">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{weekday}</span>
                  <span className="block font-heading font-bold">{formatDayShort(e.dayKey, locale)}</span>
                </span>
                <span className="text-sm font-semibold sm:order-none">
                  <span className="hidden sm:inline">{formatTime(e.startAt, locale)}</span>
                </span>
                <span className="col-start-2 min-w-0 sm:col-start-auto">
                  <span className="block font-semibold">
                    <span className="sm:hidden">{formatTime(e.startAt, locale)} · </span>
                    {e.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin size={14} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{e.place}</span>
                  </span>
                </span>
                <span className="col-start-2 sm:col-start-auto">{c && <CategoryTag category={c} />}</span>
                <span className="sr-only">{t.calendar.showInAgenda}</span>
              </button>
              <Link
                href={`/events/${e.eventId}`}
                aria-label={`${t.card.details}: ${e.title}`}
                className="flex min-w-11 items-center justify-center px-2 text-accent hover:bg-accent-soft"
              >
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
