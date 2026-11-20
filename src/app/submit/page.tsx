import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { requireUser } from "@/lib/permissions";
import { getCategories, getVenues } from "@/lib/queries";
import { getHouses } from "@/lib/houses";
import { todayKey } from "@/lib/dates";
import { EventForm, HowItWorks } from "@/components/forms/EventForm";
import type { EventFormValues } from "@/lib/validation";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.submit.title };
}

export default async function SubmitPage() {
  const user = await requireUser("/submit");
  const { locale, t } = await getI18n();
  const [categories, venues, houses] = await Promise.all([getCategories(locale), getVenues(locale), getHouses(locale)]);

  const initial: EventFormValues = {
    title: "",
    categoryId: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    houseId: "",
    venueId: "",
    customLocation: "",
    audience: "RESIDENTS_ONLY",
    spaceImpact: "NONE",
    restrictionNote: "",
    accessPass: "",
    organiserName: user.organisation ?? "",
    contactEmail: user.email,
    registrationUrl: "",
    imageUrl: "",
    recurrence: "NONE",
    recurrenceEnd: "",
  };

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">{t.submit.title}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{t.submit.subtitle}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <EventForm mode="organiser" initial={initial} categories={categories} houses={houses} venues={venues} todayKey={todayKey()} userEmail={user.email} />
        <div><HowItWorks /></div>
      </div>
    </div>
  );
}
