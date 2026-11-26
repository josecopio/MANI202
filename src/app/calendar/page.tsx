import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleCheck, DoorClosed, Home, ShieldCheck, Ticket, TriangleAlert } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getPrefs } from "@/lib/prefs";
import { followedHouses } from "@/lib/prefs-shared";
import { getHouses } from "@/lib/houses";
import { getRestrictions, type RestrictionItem } from "@/lib/queries";
import { addDaysToKey, formatTime, intlLocale, todayKey } from "@/lib/dates";
import { getBaseUrl } from "@/lib/site";
import { cn, fmt } from "@/lib/utils";
import { EditPanel } from "@/components/calendar/EditPanel";
import { CalendarConnect } from "@/components/calendar/CalendarConnect";
import { PushSignup } from "@/components/calendar/PushSignup";
import { vapidPublicKey } from "@/lib/push";

const DAYS = 7;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.access.eyebrow };
}

/** The Calendar tab: access restrictions in the resident's houses for the next seven days. */
export default async function CalendarPage() {
  const { locale, t } = await getI18n();
  const [prefs, houses] = await Promise.all([getPrefs(), getHouses(locale)]);
  const followed = followedHouses(prefs);
  const today = todayKey();
  const items = await getRestrictions({ fromKey: today, days: DAYS, houses: followed.length ? followed : null, locale });

  const color = new Map(houses.map((h) => [h.slug, h.color]));
  const days = Array.from({ length: DAYS }, (_, i) => addDaysToKey(today, i));
  const byDay = new Map(days.map((d) => [d, items.filter((e) => e.dayKey === d)]));

  const feed = new URLSearchParams();
  if (followed.length) feed.set("houses", followed.join(","));
  if (prefs.home) feed.set("home", prefs.home);
  if (locale !== "fr") feed.set("lang", locale);

  const weekday = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: "UTC" });
  const dayNum = new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "short", timeZone: "UTC" });
  const noon = (key: string) => new Date(`${key}T12:00:00Z`);
  const dayName = (key: string, i: number) =>
    i === 0 ? t.access.today : i === 1 ? t.access.tomorrow : weekday.format(noon(key)).replace(/\.$/, "");

  const count = items.length;
  const countLabel = count === 0 ? t.access.count_zero : fmt(count === 1 ? t.access.count_one : t.access.count_other, { count });

  return (
    <div className="mx-auto max-w-[1200px]">
      <h1 className="sr-only md:hidden">{t.access.eyebrow}</h1>
      {/* Value statement (desktop only) */}
      <section className="relative hidden overflow-hidden rounded-[32px] panel p-8 md:block">
        <div className="absolute inset-y-0 right-0 hidden w-40 bg-brand @3xl:block" style={{ clipPath: "polygon(35% 0, 100% 0, 100% 100%, 0 100%)" }} aria-hidden="true" />
        <ShieldCheck className="absolute right-10 top-1/2 hidden size-16 -translate-y-1/2 text-white @3xl:block" strokeWidth={1.5} aria-hidden="true" />
        <div className="relative @3xl:pr-44">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent sm:text-sm">{t.access.eyebrow}</p>
          <h1 className="mt-1.5 text-2xl font-semibold leading-tight sm:text-3xl @2xl:text-4xl">{t.access.headline}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted sm:mt-3 sm:text-[17px]">{t.access.lead}</p>
        </div>
      </section>

      {/* What is shown + edit */}
      <div className="flex flex-wrap items-center gap-3 md:mt-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold sm:text-2xl">{t.access.weekLabel}</h2>
          <p className="mt-1 text-muted">{countLabel}</p>
        </div>
        <EditPanel houses={houses} prefs={prefs} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {followed.length ? (
          <>
            <span className="text-muted">{t.access.following}</span>
            {followed.map((slug) => {
              const h = houses.find((x) => x.slug === slug);
              if (!h) return null;
              return (
                <span key={slug} className="inline-flex items-center gap-1.5 rounded-pill panel px-3 py-1 font-medium">
                  {slug === prefs.home ? (
                    <Home size={14} style={{ color: h.color }} aria-label={t.access.myHouse} />
                  ) : (
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: h.color }} aria-hidden="true" />
                  )}
                  {h.name}
                </span>
              );
            })}
          </>
        ) : (
          <span className="text-muted">{t.access.allHousesHint}</span>
        )}
      </div>

      {/* Seven days */}
      <ol className="mt-6 grid gap-3 @4xl:grid-cols-7 @4xl:gap-2">
        {days.map((key, i) => {
          const list = byDay.get(key) ?? [];
          return (
            <li
              key={key}
              className={cn(
                "panel flex flex-col rounded-[24px] p-3 @4xl:min-h-[420px]",
                i === 0 && "ring-2 ring-brand",
              )}
            >
              <h3 className="flex items-baseline justify-between gap-2 px-1 @4xl:flex-col @4xl:items-start @4xl:gap-0">
                <span className={cn("text-base font-semibold capitalize", i === 0 && "text-accent")}>{dayName(key, i)}</span>
                <span className="text-sm text-muted">{dayNum.format(noon(key)).replace(/\.$/, "")}</span>
              </h3>
              {list.length === 0 ? (
                <p className="mt-2 flex items-center gap-1.5 px-1 text-sm text-muted @4xl:mt-3">
                  <CircleCheck size={16} className="shrink-0 text-brand-strong" aria-hidden="true" />
                  {t.access.noRestriction}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {list.map((e) => <RestrictionCard key={e.key} e={e} color={(e.houseSlug && color.get(e.houseSlug)) || "#565c68"} />)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-8 grid gap-4 @4xl:grid-cols-2">
        <PushSignup publicKey={vapidPublicKey()} housesKey={followed.join(",")} />
        <CalendarConnect initialBaseUrl={getBaseUrl()} feedQuery={feed.toString().replace(/%2C/g, ",")} />
      </div>
    </div>
  );

  function RestrictionCard({ e, color }: { e: RestrictionItem; color: string }) {
    const closed = e.spaceImpact === "CLOSED";
    return (
      <li>
        <Link
          href={`/events/${e.eventId}`}
          className={cn(
            "block rounded-2xl border-l-4 p-2.5 text-ink no-underline transition-colors hover:brightness-[0.98]",
            closed ? "border-danger bg-danger-soft" : "border-[#d9a400] bg-warn-soft",
          )}
        >
          <span className={cn("inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide", closed ? "text-danger" : "text-warn")}>
            {closed ? <DoorClosed size={13} aria-hidden="true" /> : <TriangleAlert size={13} aria-hidden="true" />}
            {closed ? t.access.closed : t.access.limited}
          </span>
          <span className="mt-1 block text-sm font-semibold tabular-nums">
            {formatTime(e.startAt, locale)}–{formatTime(e.endAt, locale)}
          </span>
          {e.houseName && (
            <span className="mt-1 flex items-start gap-1.5 text-sm font-medium leading-snug">
              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
              {e.houseName}
            </span>
          )}
          <span className="block text-sm leading-snug text-muted">{e.space}</span>
          {e.accessPass && (
            <span className="mt-1.5 inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-danger px-2 py-0.5 text-xs font-semibold text-white">
              <Ticket size={12} aria-hidden="true" />
              {t.access.passRequired}
            </span>
          )}
          <span className="mt-1.5 flex items-end justify-between gap-2">
            <span className="text-xs leading-snug text-muted">{fmt(t.access.bookedBy, { org: e.organiserName })}</span>
            <ArrowRight size={16} className={cn("shrink-0", closed ? "text-danger" : "text-warn")} aria-hidden="true" />
          </span>
        </Link>
      </li>
    );
  }
}
