import { buildFeed } from "@/lib/feed";
import { isLocale } from "@/lib/types";

export const dynamic = "force-dynamic";

const slugs = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]{1,60}$/.test(s))
    .slice(0, 60);

/**
 * Public ICS feed of published events.
 *   ?houses=japon,maison-internationale   every event of these houses (with their restrictions)
 *   ?general=1&category=culture,sport     plus the general events open to the subscriber
 *   ?home=japon                           the subscriber's own house (its reserved events are open to them)
 *   ?lang=fr|en
 * Without houses/general it is the whole calendar, optionally narrowed by ?category=.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lang = url.searchParams.get("lang");
  const home = slugs(url.searchParams.get("home"))[0] ?? null;
  const body = await buildFeed({
    houses: slugs(url.searchParams.get("houses")),
    general: url.searchParams.get("general") === "1",
    categorySlugs: slugs(url.searchParams.get("category")),
    home,
    locale: isLocale(lang) ? lang : "fr",
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ciup-events.ics"',
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
