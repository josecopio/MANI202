import Link from "next/link";
import { LogOut } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { signOutAction } from "@/actions/session";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { LanguageSwitch } from "./LanguageSwitch";

export async function SiteHeader({ user }: { user: { email: string; role: string } | null }) {
  const { t } = await getI18n();

  return (
    <header className="border-b border-line bg-surface">
      <div className="page flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
        <Link href="/" className="flex min-h-11 items-center gap-4 rounded-control no-underline">
          <Logo label={t.header.markLabel} />
          <span className="hidden h-9 w-px bg-line 2xl:block" aria-hidden="true" />
          <span className="hidden font-heading text-sm font-bold uppercase leading-tight tracking-wider text-ink 2xl:block">
            {t.header.tagline}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:order-3">
          <LanguageSwitch />
          {user ? (
            <form action={signOutAction}>
              <button type="submit" className="btn btn-secondary btn-sm" title={user.email}>
                <LogOut size={16} aria-hidden="true" />
                <span>{t.header.signOut}</span>
              </button>
            </form>
          ) : null}
        </div>

        <nav aria-label={t.header.mainNav} className="flex w-full flex-wrap items-center gap-1 sm:order-2 sm:w-auto">
          <NavLink href="/">{t.header.myCalendar}</NavLink>
          <NavLink href="/houses" match="prefix">{t.header.houses}</NavLink>
          <NavLink href="/explore">{t.header.explore}</NavLink>
          <NavLink href="/subscriptions">{t.header.subscriptions}</NavLink>
          {user && <NavLink href="/submit">{t.header.submit}</NavLink>}
          {user && <NavLink href="/my-events" match="prefix">{t.header.myEvents}</NavLink>}
          {user?.role === "ADMIN" && <NavLink href="/admin" match="prefix">{t.header.admin}</NavLink>}
        </nav>
      </div>
    </header>
  );
}
