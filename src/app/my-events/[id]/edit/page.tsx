import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { canManageEvent, requireUser } from "@/lib/permissions";
import { getCategories, getVenues } from "@/lib/queries";
import { todayKey } from "@/lib/dates";
import { eventToFormValues } from "@/lib/event-helpers";
import { EventForm, HowItWorks } from "@/components/forms/EventForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.submit.editTitle, robots: { index: false } };
}

export default async function EditMyEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/my-events/${id}/edit`);
  const { locale, t } = await getI18n();
  const event = await db.event.findUnique({ where: { id } });
  if (!event || !canManageEvent(user, event)) notFound();
  const [categories, venues] = await Promise.all([getCategories(locale), getVenues(locale)]);

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">{t.submit.editTitle}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <EventForm
          mode="organiser"
          eventId={event.id}
          status={event.status}
          rejectionReason={event.rejectionReason}
          initial={eventToFormValues(event)}
          categories={categories}
          venues={venues}
          todayKey={todayKey()}
          userEmail={user.email}
        />
        <div><HowItWorks /></div>
      </div>
    </div>
  );
}
