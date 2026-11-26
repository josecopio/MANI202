import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, DoorClosed, MapPin, Repeat, Ticket, TriangleAlert, Users } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser, canManageEvent } from "@/lib/permissions";
import { impactLabel } from "@/lib/restrictions";
import { eventTexts } from "@/lib/event-text";
import { getEventWithRelations, placeLabel } from "@/lib/queries";
import { dayKeyOf, formatDayLong, formatTime } from "@/lib/dates";
import { expandOccurrences } from "@/lib/recurrence";
import { eventUrl, getBaseUrl } from "@/lib/site";
import { cn, fmt } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EntranceMap } from "@/components/event/EntranceMap";
import { resolvePlan } from "@/lib/access-map-mock";
import { isVideoDemo } from "@/lib/video-demo";

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
  const text = eventTexts(event, locale);
  const description = `${when} · ${placeLabel(event.house, event.venue, event.customLocation, locale)} — ${text.description}`.slice(0, 200);
  const image = event.imageUrl ? [{ url: event.imageUrl.startsWith("/") ? `${getBaseUrl()}${event.imageUrl}` : event.imageUrl }] : undefined;

  return {
    title: text.title,
    description,
    robots: event.status === "PUBLISHED" ? undefined : { index: false },
    alternates: { canonical: eventUrl(event.id) },
    openGraph: {
      type: "website",
      url: eventUrl(event.id),
      title: text.title,
      description,
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      // Without an uploaded image, Next adds the generated opengraph-image of this route.
      ...(image ? { images: image } : {}),
    },
    twitter: { card: "summary_large_image", title: text.title, description },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, t } = await getI18n();
  const event = await loadVisible(id);
  if (!event) notFound();

  const published = event.status === "PUBLISHED";
  const closed = event.spaceImpact === "CLOSED";
  const text = eventTexts(event, locale);
  const demo = await isVideoDemo();
  // MOCK (demo video): entrance map of the house, only in video demo mode.
  const plan = demo ? resolvePlan({ houseSlug: event.house?.slug ?? null, spaceFr: event.venue.nameFr, spaceImpact: event.spaceImpact }) : null;

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
    { icon: Users, label: t.detail.organiser, value: event.organiserName },
  ].filter((f) => f.value);

  return (
    <article className="mx-auto max-w-4xl">
      <Link href="/calendar" className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-accent">
        <ArrowLeft size={18} aria-hidden="true" />
        {t.access.eyebrow}
      </Link>

      {!published && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-control bg-warn-soft p-4 text-warn">
          <StatusBadge status={event.status} />
          <p className="font-medium">{t.detail.notPublished}</p>
        </div>
      )}
      {event.isSample && !demo && <p className="mt-2 rounded-control bg-neutral-soft p-3 text-sm font-medium text-muted">{t.detail.sampleNotice}</p>}

      <div className="mt-4 overflow-hidden rounded-[32px] md:bg-surface">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="max-h-80 w-full object-cover" />
        )}
        <div className="py-2 md:p-8">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-semibold uppercase tracking-wide",
              closed ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn",
            )}
          >
            {closed ? <DoorClosed size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
            {closed ? t.access.closed : t.access.limited}
          </span>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{text.title}</h1>

          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-3">
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

          {/* What changes for residents */}
          <section aria-labelledby="changes" className="mt-8 rounded-[24px] bg-bg p-5 sm:p-6">
            <h2 id="changes" className="text-xl font-semibold">{t.access.whatChanges}</h2>
            <p className="mt-2 text-[17px]">
              <span className="font-semibold">{placeLabel(event.house, event.venue, event.customLocation, locale)}</span>
              {" · "}
              {impactLabel(t, event.spaceImpact)}
            </p>
            {text.restrictionNote && <p className="mt-2 text-[17px] leading-relaxed">{text.restrictionNote}</p>}
            {text.accessPass && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-danger bg-danger-soft p-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-danger text-white" aria-hidden="true">
                  <Ticket size={20} />
                </span>
                <div>
                  <p className="font-semibold text-danger">{t.access.passRequired}</p>
                  <p className="mt-0.5 leading-relaxed">{text.accessPass}</p>
                </div>
              </div>
            )}
            {plan && event.house && (
              <EntranceMap resolved={plan} houseName={locale === "fr" ? event.house.nameFr : event.house.nameEn} locale={locale} t={t} />
            )}
          </section>

          {text.description && (
            <section aria-labelledby="about" className="mt-8">
              <h2 id="about" className="text-xl font-semibold">{t.access.about}</h2>
              <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-muted">{text.description}</p>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
