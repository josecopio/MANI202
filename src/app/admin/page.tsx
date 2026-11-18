import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/permissions";
import { dayKeyOf, formatDayLong, formatTime } from "@/lib/dates";
import { placeLabel } from "@/lib/queries";
import { EVENT_STATUSES, type EventStatus } from "@/lib/types";
import { cn, fmt, plural } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { DeleteEventButton } from "@/components/ui/DeleteEventButton";
import { ReviewCard, type ReviewEvent } from "@/components/admin/ReviewCard";
import { CategoryManager, HouseManager, VenueManager } from "@/components/admin/ReferenceManager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.admin.title, robots: { index: false } };
}

const PAGE_SIZE = 25;
type Tab = "review" | "events" | "categories" | "houses" | "venues";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; page?: string; notice?: string }>;
}) {
  await requireAdmin("/admin");
  const { locale, t } = await getI18n();
  const sp = await searchParams;
  const tab: Tab = (["review", "events", "categories", "houses", "venues"] as const).find((x) => x === sp.tab) ?? "review";

  const pendingCount = await db.event.count({ where: { status: "PENDING" } });
  const tabs: [Tab, string][] = [
    ["review", `${t.admin.tabReview}${pendingCount ? ` (${pendingCount})` : ""}`],
    ["events", t.admin.tabEvents],
    ["categories", t.admin.tabCategories],
    ["houses", t.admin.tabHouses],
    ["venues", t.admin.tabVenues],
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold sm:text-4xl">{t.admin.title}</h1>
      <p className="mt-2 text-lg text-muted">{t.admin.subtitle}</p>

      {sp.notice === "saved" && (
        <div role="status" className="mt-4 rounded-control bg-accent-soft p-4 font-medium text-accent">{t.admin.saved}</div>
      )}

      <nav aria-label={t.admin.title} className="mt-6 flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn("pill", tab === key && "!border-brand !bg-brand !text-ink")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "review" && <ReviewTab />}
        {tab === "events" && <EventsTab status={sp.status} page={Number(sp.page) || 1} />}
        {tab === "categories" && <CategoriesTab />}
        {tab === "houses" && <HousesTab />}
        {tab === "venues" && <VenuesTab />}
      </div>
    </div>
  );

  // ---- Tabs --------------------------------------------------------------------------------

  async function ReviewTab() {
    const rows = await db.event.findMany({
      where: { status: "PENDING" },
      include: { venue: true, house: true, category: true, createdBy: { select: { email: true } } },
      orderBy: { updatedAt: "asc" },
    });
    if (rows.length === 0) {
      return <div className="card p-8 text-center font-semibold">{t.admin.queueEmpty}</div>;
    }
    const events: ReviewEvent[] = rows.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      dayKey: dayKeyOf(e.startAt),
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      place: placeLabel(e.house, e.venue, e.customLocation, locale),
      category: { name: locale === "fr" ? e.category.nameFr : e.category.nameEn, color: e.category.color, bgColor: e.category.bgColor },
      audience: e.audience,
      houseName: e.house ? (locale === "fr" ? e.house.nameFr : e.house.nameEn) : null,
      spaceImpact: e.spaceImpact,
      restrictionNote: e.restrictionNote,
      organiserName: e.organiserName,
      contactEmail: e.contactEmail,
      submittedBy: e.createdBy.email,
      registrationUrl: e.registrationUrl,
      imageUrl: e.imageUrl,
      recurrenceLabel:
        e.recurrence !== "NONE" && e.recurrenceEnd
          ? fmt(e.recurrence === "WEEKLY" ? t.card.repeatsWeekly : t.card.repeatsMonthly, { date: formatDayLong(dayKeyOf(e.recurrenceEnd), locale) })
          : null,
      isSample: e.isSample,
    }));
    return (
      <>
        <h2 className="mb-3 font-heading text-xl font-bold">
          {fmt(plural(events.length, t.admin.pendingCount_one, t.admin.pendingCount_other, locale), { count: events.length })}
        </h2>
        <ul className="space-y-4">
          {events.map((e) => <ReviewCard key={e.id} event={e} />)}
        </ul>
      </>
    );
  }

  async function EventsTab({ status, page }: { status?: string; page: number }) {
    const statusFilter = EVENT_STATUSES.find((s) => s === status) as EventStatus | undefined;
    const where: Prisma.EventWhereInput = statusFilter ? { status: statusFilter } : {};
    const total = await db.event.count({ where });
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const current = Math.min(Math.max(1, page), pages);
    const rows = await db.event.findMany({
      where,
      include: { venue: true, house: true, category: true },
      orderBy: { startAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
    const href = (p: number) => `/admin?tab=events${statusFilter ? `&status=${statusFilter}` : ""}&page=${p}`;

    return (
      <>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t.admin.filterStatus}>
          {[undefined, ...EVENT_STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={`/admin?tab=events${s ? `&status=${s}` : ""}`}
              aria-current={statusFilter === s ? "true" : undefined}
              className={cn("pill", statusFilter === s && "!border-brand !bg-brand !text-ink")}
            >
              {s ? t.status[s] : t.admin.allStatuses}
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="card p-8 text-center font-semibold">{t.admin.noEvents}</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-bg">
                  {[t.admin.colTitle, t.admin.colDate, t.admin.colOrganiser, t.admin.colCategory, t.admin.colStatus].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                  <th scope="col" className="px-4 py-3"><span className="sr-only">{t.myEvents.colActions}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <tr key={e.id}>
                    <th scope="row" className="max-w-[260px] px-4 py-3 font-semibold">
                      <Link href={`/events/${e.id}`} className="text-accent underline underline-offset-2">{e.title}</Link>
                      {e.isSample && <span className="badge ml-2 bg-neutral-soft text-muted">{t.calendar.sample}</span>}
                    </th>
                    <td className="px-4 py-3 whitespace-nowrap">{dayKeyOf(e.startAt)} · {formatTime(e.startAt, locale)}</td>
                    <td className="px-4 py-3">{e.organiserName}</td>
                    <td className="px-4 py-3">
                      <CategoryTag category={{ name: locale === "fr" ? e.category.nameFr : e.category.nameEn, color: e.category.color, bgColor: e.category.bgColor }} />
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/events/${e.id}/edit`} className="btn btn-secondary btn-sm">
                          <Pencil size={16} aria-hidden="true" />{t.common.edit}<span className="sr-only">: {e.title}</span>
                        </Link>
                        <DeleteEventButton eventId={e.id} title={e.title} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
            {current > 1 ? <Link href={href(current - 1)} className="btn btn-secondary btn-sm">{t.admin.prevPage}</Link> : <span />}
            <span className="text-sm text-muted">{fmt(t.admin.pageOf, { page: current, pages })}</span>
            {current < pages ? <Link href={href(current + 1)} className="btn btn-secondary btn-sm">{t.admin.nextPage}</Link> : <span />}
          </nav>
        )}
      </>
    );
  }

  async function CategoriesTab() {
    const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }], include: { _count: { select: { events: true } } } });
    return <CategoryManager rows={rows.map(({ _count, ...c }) => ({ ...c, used: _count.events }))} />;
  }

  async function HousesTab() {
    const rows = await db.house.findMany({
      orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }],
      include: { _count: { select: { events: true, venues: true } } },
    });
    return <HouseManager rows={rows.map(({ _count, slug: _slug, ...h }) => ({ ...h, used: _count.events, spaces: _count.venues }))} />;
  }

  async function VenuesTab() {
    const [rows, houses] = await Promise.all([
      db.venue.findMany({ orderBy: [{ houseId: "asc" }, { sortOrder: "asc" }, { nameFr: "asc" }], include: { _count: { select: { events: true } } } }),
      db.house.findMany({ orderBy: [{ sortOrder: "asc" }, { nameFr: "asc" }] }),
    ]);
    return (
      <VenueManager
        rows={rows.map(({ _count, ...v }) => ({ ...v, used: _count.events }))}
        houses={houses.map((h) => ({ id: h.id, name: locale === "fr" ? h.nameFr : h.nameEn }))}
      />
    );
  }
}
