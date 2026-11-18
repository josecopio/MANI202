import { buildFeed } from "@/lib/feed";
import { isLocale } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public ICS feed of published events. Filter with ?category=culture,sport and ?lang=fr|en. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlugs = (url.searchParams.get("category") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .slice(0, 20);
  const lang = url.searchParams.get("lang");
  const body = await buildFeed({ categorySlugs, locale: isLocale(lang) ? lang : "fr" });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ciup-events.ics"',
      "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
