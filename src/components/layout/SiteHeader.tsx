import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
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
        <Link href="/" className="flex min-h-11 items-center gap-3 rounded-control no-underline">
          <Logo label={t.header.markLabel} />
          <span className="leading-tight">
            <span className="block font-heading text-lg font-bold text-ink">{t.header.title}</span>
            <span className="block text-sm text-muted">{t.header.tagline}</span>
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
          ) : (
            <Link href="/signin" className="btn btn-secondary btn-sm">
              <LogIn size={16} aria-hidden="true" />
              <span>{t.header.signIn}</span>
            </Link>
          )}
        </div>

        <nav aria-label={t.header.mainNav} className="flex w-full flex-wrap items-center gap-1 sm:order-2 sm:w-auto">
          <NavLink href="/">{t.header.calendar}</NavLink>
          <NavLink href="/submit">{t.header.submit}</NavLink>
          {user && <NavLink href="/my-events" match="prefix">{t.header.myEvents}</NavLink>}
          {user?.role === "ADMIN" && <NavLink href="/admin" match="prefix">{t.header.admin}</NavLink>}
        </nav>
      </div>
    </header>
  );
}
