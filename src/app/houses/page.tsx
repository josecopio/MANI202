import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FollowButton } from "@/components/houses/FollowButton";
import { getI18n } from "@/lib/i18n/server";
import { getHouses, getHouseSummaries } from "@/lib/houses";
import { getPrefs } from "@/lib/prefs";
import { plural } from "@/lib/utils";
import { fmt } from "@/lib/utils";

export default async function HousesPage() {
  const { locale, t } = await getI18n();
  const [houses, summaries, prefs] = await Promise.all([getHouses(locale), getHouseSummaries(), getPrefs()]);

  const groups = [
    { title: t.houses.residences, items: houses.filter((h) => h.isResidence) },
    { title: t.houses.shared, items: houses.filter((h) => !h.isResidence) },
  ];

  return (
    <div>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{t.houses.title}</h1>
        <p className="mt-2 text-lg text-muted">{t.houses.subtitle}</p>
      </div>

      {groups.map((g) => (
        <section key={g.title} className="mt-8" aria-labelledby={`g-${g.title}`}>
          <h2 id={`g-${g.title}`} className="font-heading text-xl font-bold">
            {g.title}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((h) => {
              const sum = summaries.get(h.slug) ?? { upcoming: 0, restricted: 0 };
              const isHome = prefs.home === h.slug;
              const following = isHome || prefs.houses.includes(h.slug);
              return (
                <li key={h.slug} className="card flex flex-col overflow-hidden" style={{ borderTop: `6px solid ${h.color}` }}>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading text-lg font-bold leading-snug">
                        <Link href={`/houses/${h.slug}`} className="no-underline hover:underline">
                          {h.name}
                        </Link>
                      </h3>
                      {isHome && <span className="badge shrink-0 bg-brand text-ink">{t.houses.yourHome}</span>}
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {sum.upcoming === 0
                        ? t.houses.nothingPlanned
                        : fmt(plural(sum.upcoming, t.houses.upcoming_one, t.houses.upcoming_other, locale), { count: sum.upcoming })}
                      {sum.restricted > 0 && (
                        <>
                          {" · "}
                          <span className="font-semibold text-warn">
                            {fmt(plural(sum.restricted, t.houses.restricted_one, t.houses.restricted_other, locale), { count: sum.restricted })}
                          </span>
                        </>
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <FollowButton slug={h.slug} following={following} isHome={isHome} canBeHome={h.isResidence} />
                      <Link href={`/houses/${h.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent">
                        {t.houses.openCalendar}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
