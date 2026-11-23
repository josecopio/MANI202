"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell, CalendarDays, Compass, Contact, FilePlus2, House, LayoutGrid, ListTodo, LogOut, Newspaper, QrCode,
  Receipt, Search, Settings, ShieldCheck, SquareCheckBig, type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/actions/session";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Key =
  | "news" | "calendar" | "services" | "house" | "identification" | "directory" | "map" | "search"
  | "profile" | "checklists" | "invoices" | "notifications" | "settings";

type Item = { key: Key; href: string; icon: LucideIcon | "avatar"; match?: string[] };

const MAIN: Item[] = [
  { key: "news", href: "/", icon: Newspaper },
  { key: "calendar", href: "/calendar", icon: CalendarDays, match: ["/calendar", "/events"] },
  { key: "services", href: "/services", icon: LayoutGrid },
  { key: "house", href: "/house", icon: House },
  { key: "identification", href: "/identification", icon: QrCode },
  { key: "directory", href: "/directory", icon: Contact },
  { key: "map", href: "/map", icon: Compass },
  { key: "search", href: "/search", icon: Search },
];

const ACCOUNT: Item[] = [
  { key: "profile", href: "/profile", icon: "avatar" },
  { key: "checklists", href: "/checklists", icon: SquareCheckBig },
  { key: "invoices", href: "/invoices", icon: Receipt },
  { key: "notifications", href: "/notifications", icon: Bell },
  { key: "settings", href: "/settings", icon: Settings },
];

// The phone app's tab bar, with the Agenda added next to News.
const MOBILE: Key[] = ["news", "calendar", "services", "house", "identification", "profile"];

function isActive(pathname: string, item: Item) {
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#ece6f3] font-semibold text-[#5e3f80]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export { Avatar };

function SideLink({ item, initials, pathname }: { item: Item; initials: string; pathname: string }) {
  const { t } = useI18n();
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center gap-4 rounded-2xl px-4 text-[17px] no-underline transition-colors",
          active ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-bg",
        )}
      >
        {Icon === "avatar" ? <Avatar initials={initials} size={28} /> : <Icon size={24} strokeWidth={1.5} aria-hidden="true" />}
        {t.portal[item.key]}
      </Link>
    </li>
  );
}

/** Left column of the portal (tablet and desktop). */
export function SidebarNav({ initials, organiser }: { initials: string; organiser: { admin: boolean } | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const tools: { href: string; label: string; icon: LucideIcon }[] = organiser
    ? [
        { href: "/submit", label: t.header.submit, icon: FilePlus2 },
        { href: "/my-events", label: t.header.myEvents, icon: ListTodo },
        ...(organiser.admin ? [{ href: "/admin", label: t.header.admin, icon: ShieldCheck }] : []),
      ]
    : [];

  return (
    <nav aria-label={t.portal.nav}>
      <ul className="space-y-1">
        {MAIN.map((item) => <SideLink key={item.key} item={item} initials={initials} pathname={pathname} />)}
      </ul>
      <hr className="mx-4 my-5 border-line" />
      <ul className="space-y-1">
        {ACCOUNT.map((item) => <SideLink key={item.key} item={item} initials={initials} pathname={pathname} />)}
      </ul>
      {tools.length > 0 && (
        <>
          <hr className="mx-4 my-5 border-line" />
          <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">{t.portal.organisers}</p>
          <ul className="space-y-1">
            {tools.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-4 rounded-2xl px-4 text-[15px] no-underline",
                      active ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-bg",
                    )}
                  >
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
            <li>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center gap-4 rounded-2xl px-4 text-left text-[15px] text-ink hover:bg-bg"
                >
                  <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
                  {t.header.signOut}
                </button>
              </form>
            </li>
          </ul>
        </>
      )}
    </nav>
  );
}

/** Bottom tab bar of the portal (phones), as in the residents' app. */
export function MobileTabBar({ initials }: { initials: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = MOBILE.map((k) => [...MAIN, ...ACCOUNT].find((i) => i.key === k)!);
  return (
    <nav
      aria-label={t.portal.nav}
      className="fixed inset-x-0 bottom-0 z-40 bg-surface pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-1px_12px_rgba(30,32,35,0.06)] md:hidden"
    >
      <ul className="grid grid-cols-6 pt-2">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-start gap-1 text-[10px] leading-tight tracking-tight no-underline min-[400px]:text-[11px]",
                  active ? "font-medium text-brand-strong" : "text-ink",
                )}
              >
                <span className={cn("inline-flex size-11 items-center justify-center rounded-full", active && "bg-accent-soft")}>
                  {Icon === "avatar" ? <Avatar initials={initials} size={30} /> : <Icon size={26} strokeWidth={1.4} aria-hidden="true" />}
                </span>
                <span className="max-w-full truncate">{t.portal[item.key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** "News | Events"-style pill tabs used at the top of portal pages. */
export function PillTabs({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: { href: string; label: string; exact?: boolean }[];
  /** Href of the active tab, when it cannot be derived from the path (query-string tabs). */
  current?: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((tab) => {
        const path = tab.href.split("?")[0];
        const active = current !== undefined ? current === tab.href : tab.exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-pill px-4 text-[17px] no-underline transition-colors",
              active ? "bg-accent-soft font-medium text-accent" : "text-ink hover:bg-surface",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Renders its children except on the given paths (the calendar needs the full width). */
export function HiddenOn({ prefixes, children }: { prefixes: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  if (prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  return <>{children}</>;
}
