import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/permissions";
import { getCategories, getVenues } from "@/lib/queries";
import { getHouses } from "@/lib/houses";
import { todayKey } from "@/lib/dates";
import { eventToFormValues } from "@/lib/event-helpers";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EventForm } from "@/components/forms/EventForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.editTitle, robots: { index: false } };
}

export default async function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin(`/admin/events/${id}/edit`);
  const { locale, t } = await getI18n();
  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();
  const [categories, venues, houses] = await Promise.all([getCategories(locale), getVenues(locale), getHouses(locale)]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{t.admin.editTitle}</h1>
        <StatusBadge status={event.status} />
      </div>
      <div className="mt-6">
        <EventForm mode="admin" eventId={event.id} status={event.status} initial={eventToFormValues(event)} categories={categories} houses={houses} venues={venues} todayKey={todayKey()} />
      </div>
    </div>
  );
}
