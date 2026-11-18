import { getCurrentUser } from "./permissions";
import { getDeviceId } from "./device";
import { getCalendarEvents, getCategories, getInterestedEventIds, type CalendarScope } from "./queries";
import { currentMonth, isDateKey, monthGrid, monthKey, parseMonthParam, todayKey } from "./dates";
import type { Locale } from "./types";

export type SearchParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Everything a calendar page needs, read from the URL (month, view, filters) and the database. */
export async function loadCalendarData(opts: {
  sp: SearchParams;
  scope: CalendarScope;
  home: string | null;
  locale: Locale;
  /** Source filters accepted in the URL ("my calendar": followed house slugs and "general"). */
  validSources?: string[];
}) {
  const { sp, scope, home, locale } = opts;
  const month = parseMonthParam(first(sp.month)) ?? currentMonth();
  const view = first(sp.view) === "list" ? ("list" as const) : ("month" as const);
  const q = (first(sp.q) ?? "").slice(0, 100);
  const mine = first(sp.mine) === "1";
  const onlyRestricted = first(sp.restricted) === "1";

  const categories = await getCategories(locale);
  const known = new Set(categories.map((c) => c.slug));
  const selectedCategories =
    scope.kind === "mine"
      ? []
      : (first(sp.category) ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => known.has(s));
  const validSources = new Set(opts.validSources ?? []);
  const sources = (first(sp.src) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => validSources.has(s));

  const user = await getCurrentUser();
  const interestedIds = await getInterestedEventIds({ userId: user?.id, deviceId: await getDeviceId() });

  const events = await getCalendarEvents({
    month,
    scope,
    home,
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

  return { month, view, q, mine, onlyRestricted, categories, selectedCategories, sources, events, interestedIds, initialDay, todayKey: today };
}

/** Query string for the ICS feed that matches a resident's choices. */
export function feedQueryFor(opts: {
  houses: string[];
  home: string | null;
  interests: string[];
  general: boolean;
  locale: Locale;
}): string {
  const p = new URLSearchParams();
  if (opts.houses.length) p.set("houses", opts.houses.join(","));
  if (opts.general) {
    p.set("general", "1");
    if (opts.interests.length) p.set("category", opts.interests.join(","));
  }
  if (opts.home) p.set("home", opts.home);
  if (opts.locale !== "fr") p.set("lang", opts.locale);
  return p.toString().replace(/%2C/g, ",");
}
