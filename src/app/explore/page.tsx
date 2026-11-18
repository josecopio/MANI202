import { CalendarView } from "@/components/calendar/CalendarView";
import { SubscribeBox } from "@/components/calendar/SubscribeBox";
import { getI18n } from "@/lib/i18n/server";
import { getPrefs } from "@/lib/prefs";
import { feedQueryFor, loadCalendarData, type SearchParams } from "@/lib/calendar-page";
import { getBaseUrl } from "@/lib/site";

/** The general calendar: every event the resident may attend, narrowed by interests (categories). */
export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const prefs = await getPrefs();
  const data = await loadCalendarData({ sp, scope: { kind: "general" }, home: prefs.home, locale });

  return (
    <CalendarView
      {...data}
      scope="general"
      basePath="/explore"
      title={t.calendar.exploreTitle}
      subtitle={t.calendar.exploreSubtitle}
      houses={[]}
      home={prefs.home}
      generalOn={false}
      aside={
        <SubscribeBox
          initialBaseUrl={getBaseUrl()}
          // The general feed follows the categories chosen here; the resident's own house keeps
          // its reserved events in the feed.
          feedQuery={feedQueryFor({ houses: [], home: prefs.home, interests: data.selectedCategories, general: true, locale })}
          title={t.subscribe.generalTitle}
          help={t.subscribe.generalHelp}
        />
      }
    />
  );
}
