"use client";

import Link from "next/link";
import { CalendarPlus, ChevronDown, ExternalLink, MapPin, Repeat, Users } from "lucide-react";
import { formatDayLong, formatTime } from "@/lib/dates";
import { useI18n, usePlural } from "@/lib/i18n/client";
import type { CalendarEvent, CategoryView } from "@/lib/queries";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { InterestButton } from "@/components/events/InterestButton";
import { cn, fmt } from "@/lib/utils";

type Props = {
  day: string;
  events: CalendarEvent[];
  categories: Map<string, CategoryView>;
  interested: Set<string>;
  expanded: Set<string>;
  onToggle: (key: string) => void;
};

export function AgendaPanel({ day, events, categories, interested, expanded, onToggle }: Props) {
  const { locale, t } = useI18n();
  const plural = usePlural();

  return (
    <section id="agenda" aria-labelledby="agenda-heading" className="card p-4 sm:p-5">
      <h2 id="agenda-heading" tabIndex={-1} className="font-heading text-xl font-bold outline-none">
        {t.calendar.agenda}
      </h2>
      <p className="mt-0.5 text-sm text-muted" aria-live="polite">
        <span className="first-letter:uppercase">{formatDayLong(day, locale)}</span>
        {" · "}
        {plural(t.calendar as unknown as Record<string, string>, "agendaCount", events.length)}
      </p>

      {events.length === 0 ? (
        <div className="mt-4 rounded-control bg-accent-soft p-4">
          <p className="font-semibold">{t.calendar.agendaEmpty}</p>
          <Link href="/submit" className="mt-1 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-2">
            {t.calendar.agendaEmptyCta}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((e) => {
            const open = expanded.has(e.key);
            const c = categories.get(e.categorySlug);
            const panelId = `agenda-panel-${e.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
            return (
              <li key={e.key} className="rounded-control border border-line bg-surface">
                <h3 className="font-sans text-base">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="flex min-h-11 w-full items-start gap-3 rounded-control p-3 text-left hover:bg-accent-soft"
                    onClick={() => onToggle(e.key)}
                  >
                    <span className="w-14 shrink-0 text-sm leading-tight">
                      <span className="block font-heading text-base font-bold">{formatTime(e.startAt, locale)}</span>
                      <span className="block text-muted">{fmt(t.card.until, { time: formatTime(e.endAt, locale) })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{e.title}</span>
                      <span className="mt-1 flex items-center gap-1 text-sm font-normal text-muted">
                        <MapPin size={14} aria-hidden="true" className="shrink-0" />
                        <span>{e.place}</span>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        {c && <CategoryTag category={c} />}
                        {e.isSample && <span className="badge bg-neutral-soft text-muted">{t.calendar.sample}</span>}
                      </span>
                    </span>
                    <ChevronDown
                      size={20}
                      aria-hidden="true"
                      className={cn("mt-0.5 shrink-0 text-muted transition-transform", open && "rotate-180")}
                    />
                  </button>
                </h3>

                <div id={panelId} hidden={!open} className="border-t border-line px-3 pb-3 pt-3">
                  <p className="whitespace-pre-line text-[15px]">{e.description}</p>
                  <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <dt className="font-semibold">{t.card.organiser}</dt>
                      <dd className="text-muted">{e.organiserName}</dd>
                    </div>
                    <div className="flex items-center gap-2">
                      <dt className="font-semibold">{t.card.audience}</dt>
                      <dd className="flex items-center gap-1 text-muted">
                        <Users size={14} aria-hidden="true" />
                        {e.audience === "RESIDENTS_ONLY" ? t.card.audienceResidents : t.card.audiencePublic}
                      </dd>
                    </div>
                    {e.recurrence !== "NONE" && e.recurrenceEnd && (
                      <div className="flex items-center gap-1 text-muted">
                        <Repeat size={14} aria-hidden="true" />
                        {fmt(e.recurrence === "WEEKLY" ? t.card.repeatsWeekly : t.card.repeatsMonthly, {
                          date: formatDayLong(e.recurrenceEnd, locale),
                        })}
                      </div>
                    )}
                  </dl>
                  <div className="mt-4 flex flex-wrap items-start gap-2">
                    <InterestButton eventId={e.eventId} interested={interested.has(e.eventId)} />
                    <a href={`/api/events/${e.eventId}/ics?date=${e.dayKey}`} download className="btn btn-secondary btn-sm">
                      <CalendarPlus size={16} aria-hidden="true" />
                      {t.card.addToCalendar}
                    </a>
                    {e.registrationUrl && (
                      <a href={e.registrationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                        <ExternalLink size={16} aria-hidden="true" />
                        {t.card.register}
                      </a>
                    )}
                    <Link href={`/events/${e.eventId}`} className="btn btn-ghost btn-sm">
                      {t.card.details}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
