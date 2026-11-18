import Link from "next/link";
import { Settings2 } from "lucide-react";
import { CalendarView } from "@/components/calendar/CalendarView";
import { SubscribeBox } from "@/components/calendar/SubscribeBox";
import { PrefsForm } from "@/components/prefs/PrefsForm";
import { getI18n } from "@/lib/i18n/server";
import { getPrefs } from "@/lib/prefs";
import { followedHouses } from "@/lib/prefs-shared";
import { getHouses } from "@/lib/houses";
import { getCategories } from "@/lib/queries";
import { feedQueryFor, loadCalendarData, type SearchParams } from "@/lib/calendar-page";
import { getBaseUrl } from "@/lib/site";
import { fmt } from "@/lib/utils";

/** "My calendar": the houses the resident follows, plus the general events they care about. */
export default async function MyCalendarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const prefs = await getPrefs();
  const allHouses = await getHouses(locale);

  // First visit: choose the houses before showing anything.
  if (!prefs.configured) {
    const categories = await getCategories(locale);
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-card bg-brand p-6 sm:p-8">
          <h1 className="text-3xl font-bold sm:text-4xl">{t.prefs.onboardingTitle}</h1>
          <p className="mt-3 max-w-2xl text-lg">{t.prefs.onboardingIntro}</p>
        </div>
        <div className="mt-8">
          <PrefsForm houses={allHouses} categories={categories} initial={prefs} mode="onboarding" />
        </div>
      </div>
    );
  }

  const followed = followedHouses(prefs);
  const followedViews = followed.map((slug) => allHouses.find((h) => h.slug === slug)).filter((h) => !!h);
  const data = await loadCalendarData({
    sp,
    scope: { kind: "mine", houses: followed, interests: prefs.interests, general: prefs.general },
    home: prefs.home,
    locale,
    validSources: [...followed, "general"],
  });

  const homeName = allHouses.find((h) => h.slug === prefs.home)?.name;
  const summary = (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-surface p-3 text-sm sm:px-5">
      <span className="font-semibold">{homeName ? fmt(t.prefs.summaryHome, { house: homeName }) : followed.length ? "" : t.prefs.summaryNone}</span>
      {prefs.houses.length > 0 && (
        <span className="text-muted">
          {fmt(prefs.houses.length === 1 ? t.prefs.summaryOthers_one : t.prefs.summaryOthers_other, { count: prefs.houses.length })}
        </span>
      )}
      <Link href="/subscriptions" className="btn btn-ghost btn-sm ml-auto">
        <Settings2 size={16} aria-hidden="true" />
        {t.calendar.editSubscriptions}
      </Link>
    </div>
  );

  return (
    <CalendarView
      {...data}
      scope="mine"
      basePath="/"
      title={t.calendar.mineTitle}
      subtitle={t.calendar.mineSubtitle}
      houses={followedViews}
      home={prefs.home}
      generalOn={prefs.general}
      headerExtra={summary}
      aside={
        <SubscribeBox
          initialBaseUrl={getBaseUrl()}
          feedQuery={feedQueryFor({ houses: followed, home: prefs.home, interests: prefs.interests, general: prefs.general, locale })}
          title={t.subscribe.mineTitle}
          help={t.subscribe.mineHelp}
          withEmail
        />
      }
    />
  );
}
