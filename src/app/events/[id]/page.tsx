import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, ExternalLink, Home, Mail, MapPin, Repeat, Users, CalendarClock } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser, canManageEvent } from "@/lib/permissions";
import { getDeviceId } from "@/lib/device";
import { getPrefs } from "@/lib/prefs";
import { isEligible } from "@/lib/prefs-shared";
import { AccessDetails } from "@/components/events/AccessBadges";
import { getEventWithRelations, getInterestedEventIds, placeLabel } from "@/lib/queries";
import { dayKeyOf, formatDayLong, formatTime } from "@/lib/dates";
import { expandOccurrences } from "@/lib/recurrence";
import { eventUrl, getBaseUrl } from "@/lib/site";
import { fmt } from "@/lib/utils";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InterestButton } from "@/components/events/InterestButton";
import { ShareButton } from "@/components/events/ShareButton";

const load = cache(async (id: string) => getEventWithRelations(id));

async function loadVisible(id: string) {
  const event = await load(id);
  if (!event) return null;
  if (event.status === "PUBLISHED") return event;
  const user = await getCurrentUser();
  return user && canManageEvent(user, event) ? event : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { locale } = await getI18n();
  const event = await loadVisible(id);
  if (!event) return { title: "404" };

  const when = `${formatDayLong(dayKeyOf(event.startAt), locale)}, ${formatTime(event.startAt, locale)}`;
  const description = `${when} · ${placeLabel(event.house, event.venue, event.customLocation, locale)} — ${event.description}`.slice(0, 200);
  const image = event.imageUrl ? [{ url: event.imageUrl.startsWith("/") ? `${getBaseUrl()}${event.imageUrl}` : event.imageUrl }] : undefined;

  return {
    title: event.title,
    description,
    robots: event.status === "PUBLISHED" ? undefined : { index: false },
    alternates: { canonical: eventUrl(event.id) },
    openGraph: {
      type: "website",
      url: eventUrl(event.id),
      title: event.title,
      description,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      // Without an uploaded image, Next adds the generated opengraph-image of this route.
      ...(image ? { images: image } : {}),
    },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const event = await loadVisible(id);
  if (!event) notFound();

  const user = await getCurrentUser();
  const interestedIds = await getInterestedEventIds({ userId: user?.id, deviceId: await getDeviceId() });
  const prefs = await getPrefs();
  const houseName = event.house ? (locale === "fr" ? event.house.nameFr : event.house.nameEn) : null;
  const eligible = isEligible(event.audience, event.house?.slug ?? null, prefs.home);
  const published = event.status === "PUBLISHED";
  const category = { name: locale === "fr" ? event.category.nameFr : event.category.nameEn, color: event.category.color, bgColor: event.category.bgColor };

  // For a series, show the next upcoming occurrence rather than the very first date.
  const now = new Date();
  const next =
    event.recurrence !== "NONE"
      ? expandOccurrences(event, now, new Date(now.getTime() + 400 * 24 * 3600 * 1000))[0]
      : undefined;
  const startAt = next?.startAt ?? event.startAt;
  const endAt = next?.endAt ?? event.endAt;
  const dayKey = dayKeyOf(startAt);

  const facts = [
    {
      icon: CalendarClock,
      label: t.detail.when,
      value: (
        <>
          <span className="first-letter:uppercase">{formatDayLong(dayKey, locale)}</span>
          <br />
          {formatTime(startAt, locale)} – {formatTime(endAt, locale)}
          {event.recurrence !== "NONE" && event.recurrenceEnd && (
            <span className="mt-1 flex items-center gap-1 text-sm text-muted">
              <Repeat size={14} aria-hidden="true" />
              {fmt(event.recurrence === "WEEKLY" ? t.card.repeatsWeekly : t.card.repeatsMonthly, { date: formatDayLong(dayKeyOf(event.recurrenceEnd), locale) })}
            </span>
          )}
        </>
      ),
    },
    { icon: MapPin, label: t.detail.where, value: placeLabel(event.house, event.venue, event.customLocation, locale) },
    {
      icon: Home,
      label: t.detail.house,
      value: event.house ? (
        <Link href={`/houses/${event.house.slug}`} className="text-accent underline underline-offset-2">{houseName}</Link>
      ) : null,
    },
    { icon: Users, label: t.detail.organiser, value: event.organiserName },
    {
      icon: Mail,
      label: t.detail.contact,
      value: event.contactEmail ? (
        <a href={`mailto:${event.contactEmail}`} className="text-accent underline underline-offset-2">{event.contactEmail}</a>
      ) : null,
    },
  ].filter((f) => f.value);

  return (
    <article className="mx-auto max-w-4xl">
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent">
        <ArrowLeft size={18} aria-hidden="true" />
        {t.detail.allEvents}
      </Link>

      {!published && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-control bg-warn-soft p-4 text-warn">
          <StatusBadge status={event.status} />
          <p className="font-medium">{t.detail.notPublished}</p>
        </div>
      )}
      {event.isSample && <p className="mt-2 rounded-control bg-neutral-soft p-3 text-sm font-medium text-muted">{t.detail.sampleNotice}</p>}

      <div className="card mt-4 overflow-hidden">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="max-h-80 w-full object-cover" />
        )}
        <div className="p-5 sm:p-8">
          <CategoryTag category={category} />
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{event.title}</h1>

          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt className="flex items-center gap-2 text-sm font-semibold text-muted">
                  <Icon size={18} aria-hidden="true" className="shrink-0 text-accent" />
                  {label}
                </dt>
                <dd className="ml-[26px] font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <AccessDetails
              event={{ audience: event.audience, houseName, eligible, spaceImpact: event.spaceImpact }}
              note={event.restrictionNote}
            />
          </div>

          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">{event.description}</p>

          <div className="mt-8 flex flex-wrap items-start gap-2">
            {published && <InterestButton eventId={event.id} interested={interestedIds.includes(event.id)} />}
            {published && (
              <a href={`/api/events/${event.id}/ics${next ? `?date=${dayKey}` : ""}`} download className="btn btn-secondary btn-sm">
                <CalendarPlus size={16} aria-hidden="true" />
                {t.card.addToCalendar}
              </a>
            )}
            {published && event.recurrence !== "NONE" && (
              <a href={`/api/events/${event.id}/ics`} download className="btn btn-ghost btn-sm">{t.detail.seriesDownload}</a>
            )}
            {event.registrationUrl && (
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                <ExternalLink size={16} aria-hidden="true" />
                {t.card.register}
              </a>
            )}
            {published && <ShareButton title={event.title} />}
          </div>
        </div>
      </div>
    </article>
  );
}
