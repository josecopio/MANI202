import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

/** Portal sections that exist in the real app but are only placeholders in this prototype. */
const SECTIONS = [
  "services", "house", "identification", "directory", "map", "search",
  "profile", "checklists", "invoices", "notifications", "settings",
] as const;
type Section = (typeof SECTIONS)[number];

export const dynamicParams = false;
export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const { t } = await getI18n();
  return SECTIONS.includes(section as Section) ? { title: t.portal[section as Section] } : {};
}

export default async function MockSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.includes(section as Section)) notFound();
  const { t } = await getI18n();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-4xl font-medium">{t.portal[section as Section]}</h1>
      <div className="mt-8 rounded-[32px] panel p-6 sm:p-10">
        <p className="font-heading text-xl font-semibold">{t.portal.mockTitle}</p>
        <p className="mt-2 max-w-xl text-lg text-muted">{t.portal.mockBody}</p>
        <Link href="/calendar" className="btn btn-primary mt-6">
          <CalendarDays size={18} aria-hidden="true" />
          {t.portal.openCalendar}
        </Link>
      </div>
    </div>
  );
}
