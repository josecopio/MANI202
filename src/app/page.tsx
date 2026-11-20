import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { MOCK_NEWS, MOCK_RESIDENT, type MockNews } from "@/lib/portal-mock";
import { fmt } from "@/lib/utils";

const ACCENTS: Record<MockNews["accent"], string> = {
  purple: "#9a7bbd",
  yellow: "#f2c94c",
  pink: "#f19fb5",
  blue: "#7fb2e5",
};

/** Cover graphic in the portal's style: a slanted mint block with a label, next to a shape. */
function Cover({ label, accent, text }: { label: string; accent: string; text?: string }) {
  return (
    <div className="relative h-56 overflow-hidden rounded-[36px] md:rounded-[24px] bg-[#f3f1ed] @2xl:h-56" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-[58%] bg-brand" style={{ clipPath: "polygon(0 0, 100% 0, 88% 100%, 0 100%)" }} />
      <div
        className="absolute -right-6 top-1/2 flex size-44 -translate-y-1/2 items-center justify-center rounded-full font-heading text-2xl font-bold text-white"
        style={{ background: accent }}
      >
        {text}
      </div>
      <span className="absolute left-5 top-1/2 max-w-[50%] -translate-y-1/2 font-heading text-2xl font-bold leading-tight text-white drop-shadow-sm">
        {label}
      </span>
    </div>
  );
}

function Card({
  cover, title, author, when, excerpt, href, cta,
}: { cover: React.ReactNode; title: string; author: string; when: string; excerpt: string; href: string; cta: string }) {
  return (
    <li className="flex flex-col md:rounded-[32px] md:bg-surface md:p-4 md:shadow-[0_1px_2px_rgba(30,32,35,0.04)]">
      {cover}
      <div className="flex flex-1 flex-col pt-5 md:px-3 md:pb-3">
        <h2 className="text-2xl font-semibold leading-snug">{title}</h2>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent" aria-hidden="true">
            {author[0]}
          </span>
          <span className="font-semibold">{author}</span>
          <span className="h-4 w-px bg-brand" aria-hidden="true" />
          <span className="text-muted">{when}</span>
        </p>
        <p className="mt-4 line-clamp-3 text-[17px] leading-relaxed">{excerpt}</p>
        <Link
          href={href}
          className="mt-auto inline-flex w-fit items-center gap-1 border-b-2 border-brand pb-1 pt-6 text-sm font-semibold uppercase tracking-wide text-ink no-underline"
        >
          {cta}
          <ArrowUpRight size={22} aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

/** The portal's home ("News"), with mock news. */
export default async function NewsPage() {
  const { locale, t } = await getI18n();

  const cards = MOCK_NEWS.map((n) => (
    <Card
      key={n.id}
      cover={<Cover label={n.label[locale]} accent={ACCENTS[n.accent]} />}
      title={n.title[locale]}
      author={n.author}
      when={fmt(n.hoursAgo < 24 ? t.portal.hoursAgo : t.portal.daysAgo, { count: n.hoursAgo < 24 ? n.hoursAgo : Math.floor(n.hoursAgo / 24) })}
      excerpt={n.excerpt[locale]}
      href="/"
      cta={t.portal.seeNews}
    />
  ));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="sr-only text-4xl font-medium md:not-sr-only">
        {t.portal.hello} <span className="text-brand-strong">{MOCK_RESIDENT.firstName}</span>,
      </h1>
      <ul className="mt-2 grid gap-10 md:mt-10 md:gap-8 @2xl:grid-cols-2">{cards}</ul>
    </div>
  );
}
