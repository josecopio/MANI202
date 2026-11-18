"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  LayoutGrid,
  List,
  Lock,
  Search,
  Star,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  currentMonth,
  formatMonthYear,
  monthGrid,
  monthKey,
  monthOfKey,
  shiftMonth,
  type MonthRef,
} from "@/lib/dates";
import { useI18n, usePlural } from "@/lib/i18n/client";
import type { CalendarEvent, CategoryView } from "@/lib/queries";
import type { HouseView } from "@/lib/houses";
import { hasRestrictions } from "@/lib/restrictions";
import { cn, fmt } from "@/lib/utils";
import { MonthGrid } from "./MonthGrid";
import { EventList } from "./EventList";
import { AgendaPanel } from "./AgendaPanel";
import { tint, type EventColor } from "./colors";

export type CalendarViewProps = {
  events: CalendarEvent[];
  categories: CategoryView[];
  /** "mine": houses are the filters; "house" / "general": categories are the filters. */
  scope: "mine" | "house" | "general";
  basePath: string;
  title: string;
  subtitle: string;
  /** Houses followed by the resident (colour-coded in "mine"). */
  houses: HouseView[];
  home: string | null;
  /** Whether general events are part of "mine". */
  generalOn: boolean;
  sources: string[];
  onlyRestricted: boolean;
  month: MonthRef;
  view: "month" | "list";
  selectedCategories: string[];
  q: string;
  mine: boolean;
  todayKey: string;
  initialDay: string;
  interestedIds: string[];
  /** Right column, below the agenda (subscription box). */
  aside?: ReactNode;
  /** Shown between the title and the filters (e.g. house header actions). */
  headerExtra?: ReactNode;
};

const GENERAL_COLOR = "#565c68";

export function CalendarView(props: CalendarViewProps) {
  const {
    categories, scope, basePath, houses, home, generalOn, sources, onlyRestricted,
    month, view, selectedCategories, mine, todayKey, initialDay, interestedIds,
  } = props;
  const { locale, t } = useI18n();
  const plural = usePlural();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const houseMap = useMemo(() => new Map(houses.map((h) => [h.slug, h])), [houses]);
  const interested = useMemo(() => new Set(interestedIds), [interestedIds]);
  const days = useMemo(() => monthGrid(month), [month]);
  const thisMonthKey = monthKey(month);
  const monthLabel = formatMonthYear(month, locale);

  // In "My calendar" the house is the main dimension, so it carries the colour.
  const colorOf = useCallback(
    (e: CalendarEvent): EventColor => {
      if (scope === "mine") {
        const color = (e.houseSlug && houseMap.get(e.houseSlug)?.color) || GENERAL_COLOR;
        return { color, bg: tint(color) };
      }
      const c = categoryMap.get(e.categorySlug);
      return { color: c?.color ?? GENERAL_COLOR, bg: c?.bgColor ?? "#eceef3" };
    },
    [scope, houseMap, categoryMap],
  );

  // ---- URL-driven state (month, view, filters) -------------------------------------
  const navigate = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search);
      mutate(params);
      const qs = params.toString();
      startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
    },
    [router, basePath],
  );

  const goToMonth = (ref: MonthRef, day?: string) =>
    navigate((p) => {
      if (monthKey(ref) === monthKey(currentMonth())) p.delete("month");
      else p.set("month", monthKey(ref));
      if (day) p.set("day", day);
      else p.delete("day");
    });

  // ---- Selected day (client state, mirrored into the URL without a server round trip) ----
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [seenInitialDay, setSeenInitialDay] = useState(initialDay);
  if (initialDay !== seenInitialDay) {
    setSeenInitialDay(initialDay);
    setSelectedDay(initialDay);
  }
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selectDay = (key: string) => {
    if (!key.startsWith(thisMonthKey)) {
      goToMonth(monthOfKey(key), key); // adjacent-month day: switch month
      return;
    }
    setSelectedDay(key);
    const params = new URLSearchParams(window.location.search);
    params.set("day", key);
    window.history.replaceState(null, "", `${basePath}?${params.toString()}`);
  };

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // ---- Search (debounced) --------------------------------------------------------------
  const [query, setQuery] = useState(props.q);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!searchTimer.current) setQuery(props.q); // keep in sync with back/forward navigation
  }, [props.q]);

  const pushQuery = (value: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    navigate((p) => {
      if (value.trim()) p.set("q", value.trim());
      else p.delete("q");
    });
  };
  const onSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => pushQuery(value), 350);
  };

  // ---- Derived data -----------------------------------------------------------------------
  const events = useMemo(
    () =>
      props.events.filter((e) => {
        if (onlyRestricted && !hasRestrictions(e)) return false;
        if (scope === "mine" && sources.length) {
          const source = e.houseSlug && houseMap.has(e.houseSlug) ? e.houseSlug : "general";
          return sources.includes(source);
        }
        return true;
      }),
    [props.events, onlyRestricted, scope, sources, houseMap],
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.dayKey);
      if (list) list.push(e);
      else map.set(e.dayKey, [e]);
    }
    return map;
  }, [events]);
  const monthEvents = useMemo(() => events.filter((e) => e.dayKey.startsWith(thisMonthKey)), [events, thisMonthKey]);
  const restrictedCount = useMemo(() => monthEvents.filter(hasRestrictions).length, [monthEvents]);
  const dayEvents = eventsByDay.get(selectedDay) ?? [];

  const toggleCategory = (slug: string) =>
    navigate((p) => {
      const next = new Set(selectedCategories);
      if (!next.delete(slug)) next.add(slug);
      if (next.size) p.set("category", [...next].join(","));
      else p.delete("category");
    });

  const toggleSource = (slug: string) =>
    navigate((p) => {
      const next = new Set(sources);
      if (!next.delete(slug)) next.add(slug);
      if (next.size) p.set("src", [...next].join(","));
      else p.delete("src");
    });

  const pickFromList = (e: CalendarEvent) => {
    selectDay(e.dayKey);
    setExpanded((prev) => new Set(prev).add(e.key));
    // On narrow screens the agenda is below the list: bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      const heading = document.getElementById("agenda-heading");
      heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      heading?.focus({ preventScroll: true });
    }
  };

  const gridLabel = fmt(t.calendar.gridLabel, { month: monthLabel });

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{props.title}</h1>
        <p className="mt-2 text-lg text-muted">{props.subtitle}</p>
      </div>
      {props.headerExtra}

      {/* Search + view toggle */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          role="search"
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            pushQuery(query);
          }}
        >
          <label htmlFor="calendar-search" className="sr-only">
            {t.calendar.searchLabel}
          </label>
          <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="calendar-search"
            type="search"
            name="q"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.calendar.searchPlaceholder}
            autoComplete="off"
            className="input pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label={t.calendar.clearSearch}
              onClick={() => {
                setQuery("");
                pushQuery("");
              }}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </form>

        <div role="group" aria-label={t.calendar.viewLabel} className="inline-flex self-start rounded-pill border border-field bg-surface p-0.5">
          {(
            [
              ["month", t.calendar.viewMonth, LayoutGrid],
              ["list", t.calendar.viewList, List],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() =>
                navigate((p) => {
                  if (value === "month") p.delete("view");
                  else p.set("view", value);
                })
              }
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-[15px] font-semibold transition-colors",
                view === value ? "bg-brand text-ink" : "text-ink hover:bg-accent-soft",
              )}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters: houses in "My calendar", categories elsewhere */}
      <div role="group" aria-label={scope === "mine" ? t.calendar.sourcesLabel : t.calendar.categoriesLabel} className="mt-4 flex flex-wrap gap-2">
        {scope === "mine" ? (
          <>
            <button type="button" className="pill" aria-pressed={sources.length === 0} onClick={() => navigate((p) => p.delete("src"))}>
              {t.calendar.allSources}
            </button>
            {houses.map((h) => {
              const on = sources.includes(h.slug);
              return (
                <button
                  key={h.slug}
                  type="button"
                  className="pill"
                  aria-pressed={on}
                  onClick={() => toggleSource(h.slug)}
                  style={on ? { backgroundColor: tint(h.color), borderColor: h.color, color: h.color } : undefined}
                >
                  {on ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: h.color }} />}
                  {h.name}
                  {h.slug === home && <span className="badge bg-brand text-ink">{t.calendar.homeBadge}</span>}
                </button>
              );
            })}
            {generalOn && (
              <button type="button" className="pill" aria-pressed={sources.includes("general")} onClick={() => toggleSource("general")}>
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GENERAL_COLOR }} />
                {t.calendar.generalSource}
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="pill" aria-pressed={selectedCategories.length === 0} onClick={() => navigate((p) => p.delete("category"))}>
              {t.calendar.allCategories}
            </button>
            {categories.map((c) => {
              const on = selectedCategories.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  className="pill"
                  aria-pressed={on}
                  onClick={() => toggleCategory(c.slug)}
                  style={on ? { backgroundColor: c.bgColor, borderColor: c.color, color: c.color } : undefined}
                >
                  {on ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />}
                  {c.name}
                </button>
              );
            })}
          </>
        )}
        <button
          type="button"
          className="pill"
          aria-pressed={onlyRestricted}
          title={t.calendar.onlyRestrictionsHint}
          onClick={() => navigate((p) => (onlyRestricted ? p.delete("restricted") : p.set("restricted", "1")))}
        >
          <Lock size={16} aria-hidden="true" />
          {t.calendar.onlyRestrictions}
        </button>
        <button
          type="button"
          className="pill"
          aria-pressed={mine}
          title={t.calendar.myListHint}
          onClick={() => navigate((p) => (mine ? p.delete("mine") : p.set("mine", "1")))}
        >
          <Star size={16} aria-hidden="true" fill={mine ? "currentColor" : "none"} />
          {t.calendar.myList}
        </button>
      </div>

      {/* Legend of the restriction markers */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" aria-label={t.calendar.legendTitle}>
        <li className="inline-flex items-center gap-1.5">
          <Lock size={14} aria-hidden="true" />
          {t.calendar.legendReserved}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <DoorClosed size={14} aria-hidden="true" />
          {t.calendar.legendClosed}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <TriangleAlert size={14} aria-hidden="true" />
          {t.calendar.legendLimited}
        </li>
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
        {/* Left: month navigation + grid/list */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1">
              <button type="button" className="btn btn-secondary px-0" aria-label={t.calendar.prevMonth} onClick={() => goToMonth(shiftMonth(month, -1))}>
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-secondary px-0" aria-label={t.calendar.nextMonth} onClick={() => goToMonth(shiftMonth(month, 1))}>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button type="button" className="btn btn-secondary ml-1" onClick={() => goToMonth(currentMonth(), todayKey)}>
                {t.calendar.today}
              </button>
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-2xl font-bold leading-tight" aria-live="polite">
                {monthLabel}
              </h2>
              <p className="text-sm text-muted" aria-live="polite">
                {plural(t.calendar as unknown as Record<string, string>, "monthCount", monthEvents.length)}
                {restrictedCount > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-warn">
                      {plural(t.calendar as unknown as Record<string, string>, "restrictionsCount", restrictedCount)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {view === "month" ? (
            <MonthGrid
              label={gridLabel}
              days={days}
              eventsByDay={eventsByDay}
              colorOf={colorOf}
              selectedDay={selectedDay}
              todayKey={todayKey}
              busy={pending}
              onSelect={selectDay}
            />
          ) : (
            <EventList
              label={fmt(t.calendar.listLabel, { month: monthLabel })}
              events={monthEvents}
              categories={categoryMap}
              colorOf={colorOf}
              selectedDay={selectedDay}
              busy={pending}
              onPick={pickFromList}
            />
          )}
        </div>

        {/* Right: agenda + subscription (stacks below on mobile) */}
        <div className="min-w-0 space-y-6">
          <AgendaPanel
            day={selectedDay}
            events={dayEvents}
            categories={categoryMap}
            colorOf={colorOf}
            interested={interested}
            expanded={expanded}
            onToggle={toggleExpanded}
          />
          {props.aside}
        </div>
      </div>
    </div>
  );
}
