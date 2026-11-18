import { getEventWithRelations } from "@/lib/queries";
import { toIcsEvent } from "@/lib/feed";
import { buildCalendar } from "@/lib/ics";
import { getLocale } from "@/lib/i18n/server";
import { getMessagesFor } from "@/lib/i18n";
import { getSiteDomain } from "@/lib/site";
import { isDateKey } from "@/lib/dates";
import { slugify } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Single-event download. With ?date=YYYY-MM-DD, exports just that occurrence of a series. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const event = await getEventWithRelations(id);
  if (!event || event.status !== "PUBLISHED") return new Response("Not found", { status: 404 });

  const locale = await getLocale();
  const date = new URL(request.url).searchParams.get("date");
  const body = buildCalendar([toIcsEvent(event, locale)], {
    calendarName: getMessagesFor(locale).meta.siteName,
    domain: getSiteDomain(),
    occurrenceDate: date && isDateKey(date) ? date : undefined,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(event.title) || "event"}.ics"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
