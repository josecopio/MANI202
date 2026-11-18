import { CalendarView } from "@/components/calendar/CalendarView";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/permissions";
import { getDeviceId } from "@/lib/device";
import { getBaseUrl } from "@/lib/site";
import { getCalendarEvents, getCategories, getInterestedEventIds } from "@/lib/queries";
import { currentMonth, isDateKey, monthGrid, monthKey, parseMonthParam, todayKey } from "@/lib/dates";

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { locale } = await getI18n();

  const month = parseMonthParam(first(sp.month)) ?? currentMonth();
  const view = first(sp.view) === "list" ? "list" : "month";
  const q = (first(sp.q) ?? "").slice(0, 100);
  const mine = first(sp.mine) === "1";

  const categories = await getCategories(locale);
  const known = new Set(categories.map((c) => c.slug));
  const selectedCategories = (first(sp.category) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => known.has(s));

  const user = await getCurrentUser();
  const deviceId = await getDeviceId();
  const interestedIds = await getInterestedEventIds({ userId: user?.id, deviceId });

  const events = await getCalendarEvents({
    month,
    categorySlugs: selectedCategories,
    q,
    onlyEventIds: mine ? interestedIds : null,
    locale,
  });

  // Selected day: ?day= if it belongs to the visible grid, else today (if in this month), else the 1st.
  const today = todayKey();
  const gridKeys = new Set(monthGrid(month).map((d) => d.key));
  const dayParam = first(sp.day);
  const initialDay =
    dayParam && isDateKey(dayParam) && gridKeys.has(dayParam)
      ? dayParam
      : today.startsWith(monthKey(month))
        ? today
        : `${monthKey(month)}-01`;

  return (
    <CalendarView
      events={events}
      categories={categories}
      month={month}
      view={view}
      selectedCategories={selectedCategories}
      q={q}
      mine={mine}
      todayKey={today}
      initialDay={initialDay}
      interestedIds={interestedIds}
      baseUrl={getBaseUrl()}
    />
  );
}
