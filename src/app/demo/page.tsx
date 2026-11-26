import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getEventWithRelations, getRestrictions } from "@/lib/queries";
import { todayKey, intlLocale } from "@/lib/dates";
import { hasPlan, pushBody } from "@/lib/access-map-mock";
import { MOCK_RESIDENT } from "@/lib/portal-mock";
import { fmt } from "@/lib/utils";
import { LockScreen } from "@/components/demo/LockScreen";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Demo", robots: { index: false, follow: false } };

/**
 * MOCK for the demo video: a phone lock screen at 7am with the morning push notification.
 * Tapping it opens the event. ?event=<id> picks the event; ?off=1 leaves video demo mode.
 */
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ event?: string; off?: string }> }) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();

  let eventId = sp.event;
  if (!eventId) {
    const today = await getRestrictions({ fromKey: todayKey(), days: 1, houses: null, locale });
    const withPlan = today.filter((e) => hasPlan(e.houseSlug));
    eventId = (withPlan.find((e) => e.accessPass) ?? withPlan[0] ?? today[0])?.eventId;
  }
  const event = eventId ? await getEventWithRelations(eventId) : null;

  const body = event
    ? pushBody(event.title, locale, [event.house?.[locale === "fr" ? "nameFr" : "nameEn"], locale === "fr" ? event.restrictionNote : event.restrictionNoteEn ?? event.restrictionNote].filter(Boolean).join(" · "))
    : t.access.pushNone;

  const date = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date());

  return (
    <LockScreen
      off={sp.off === "1"}
      href={event ? `/events/${event.id}` : "/calendar"}
      date={date}
      title={fmt(t.demo.greeting, { name: MOCK_RESIDENT.firstName })}
      body={body}
      appName={t.demo.appName}
      now={t.demo.now}
    />
  );
}
