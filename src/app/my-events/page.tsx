import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MapPin, Pencil, Plus, Repeat } from "lucide-react";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/permissions";
import { dayKeyOf, formatDayLong, formatTime } from "@/lib/dates";
import { placeLabel } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DeleteEventButton } from "@/components/ui/DeleteEventButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.myEvents.title, robots: { index: false } };
}

export default async function MyEventsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await requireUser("/my-events");
  const { locale, t } = await getI18n();
  const { notice } = await searchParams;

  const events = await db.event.findMany({
    where: { createdById: user.id },
    include: { venue: true, house: true, category: true },
    orderBy: { startAt: "desc" },
  });

  const notices: Record<string, string> = {
    draft: t.myEvents.savedDraft,
    submitted: t.myEvents.submitted,
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.myEvents.title}</h1>
          <p className="mt-2 text-lg text-muted">{t.myEvents.subtitle}</p>
        </div>
        <Link href="/submit" className="btn btn-primary">
          <Plus size={18} aria-hidden="true" />
          {t.myEvents.newEvent}
        </Link>
      </div>

      {notice && notices[notice] && (
        <div role="status" className="mt-6 rounded-control bg-accent-soft p-4 font-medium text-accent">
          {notices[notice]}
        </div>
      )}

      {events.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="font-semibold">{t.myEvents.empty}</p>
          <Link href="/submit" className="btn btn-primary mt-4">{t.myEvents.emptyCta}</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((e) => (
            <li key={e.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-sans text-lg font-semibold">
                    {e.status === "PUBLISHED" ? (
                      <Link href={`/events/${e.id}`} className="text-accent underline underline-offset-2">{e.title}</Link>
                    ) : (
                      e.title
                    )}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={14} aria-hidden="true" />
                      <span className="first-letter:uppercase">{formatDayLong(dayKeyOf(e.startAt), locale)}</span>, {formatTime(e.startAt, locale)}–{formatTime(e.endAt, locale)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} aria-hidden="true" />
                      {placeLabel(e.house, e.venue, e.customLocation, locale)}
                    </span>
                    {e.recurrence !== "NONE" && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat size={14} aria-hidden="true" />
                        {t.myEvents.repeats}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryTag category={{ name: locale === "fr" ? e.category.nameFr : e.category.nameEn, color: e.category.color, bgColor: e.category.bgColor }} />
                  <StatusBadge status={e.status} />
                </div>
              </div>

              {e.status === "REJECTED" && e.rejectionReason && (
                <p className="mt-3 rounded-control bg-danger-soft p-3 text-sm text-danger">
                  <span className="font-semibold">{t.myEvents.rejectionReason} : </span>
                  {e.rejectionReason}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/my-events/${e.id}/edit`} className="btn btn-secondary btn-sm">
                  <Pencil size={16} aria-hidden="true" />
                  {t.common.edit}
                  <span className="sr-only">: {e.title}</span>
                </Link>
                <DeleteEventButton eventId={e.id} title={e.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
