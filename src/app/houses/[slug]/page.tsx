import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { SubscribeBox } from "@/components/calendar/SubscribeBox";
import { FollowButton } from "@/components/houses/FollowButton";
import { getI18n } from "@/lib/i18n/server";
import { getHouseBySlug } from "@/lib/houses";
import { getPrefs } from "@/lib/prefs";
import { feedQueryFor, loadCalendarData, type SearchParams } from "@/lib/calendar-page";
import { getBaseUrl } from "@/lib/site";
import { fmt } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale } = await getI18n();
  const found = await getHouseBySlug(slug, locale);
  return { title: found?.house.name ?? "" };
}

export default async function HousePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const found = await getHouseBySlug(slug, locale);
  if (!found) notFound();
  const { house, spaces } = found;
  const prefs = await getPrefs();
  const isHome = prefs.home === slug;
  const following = isHome || prefs.houses.includes(slug);

  const data = await loadCalendarData({ sp, scope: { kind: "house", slug }, home: prefs.home, locale });

  const header = (
    <div className="mt-4 rounded-card border border-line bg-surface p-4 sm:p-5" style={{ borderLeft: `6px solid ${house.color}` }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FollowButton slug={slug} following={following} isHome={isHome} canBeHome={house.isResidence} size="md" />
        {isHome && <span className="badge bg-brand text-ink">{t.houses.yourHome}</span>}
      </div>
      {spaces.filter((s) => !s.isOther).length > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="font-semibold text-ink">{t.houses.spaces}</span>
          {spaces
            .filter((s) => !s.isOther)
            .map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1">
                <MapPin size={14} aria-hidden="true" />
                {s.name}
              </span>
            ))}
        </p>
      )}
    </div>
  );

  return (
    <div>
      <Link href="/houses" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent">
        <ArrowLeft size={18} aria-hidden="true" />
        {t.houses.allHouses}
      </Link>
      <CalendarView
        {...data}
        scope="house"
        basePath={`/houses/${slug}`}
        title={house.name}
        subtitle={t.calendar.houseSubtitle}
        houses={[house]}
        home={prefs.home}
        generalOn={false}
        headerExtra={header}
        aside={
          <SubscribeBox
            initialBaseUrl={getBaseUrl()}
            feedQuery={feedQueryFor({ houses: [slug], home: prefs.home, interests: [], general: false, locale })}
            title={fmt(t.subscribe.houseTitle, { house: house.name })}
            help={t.subscribe.houseHelp}
          />
        }
      />
    </div>
  );
}
