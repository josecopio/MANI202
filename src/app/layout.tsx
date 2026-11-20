import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Jost, Oswald } from "next/font/google";
import { Bell, Compass, Contact, Search } from "lucide-react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/permissions";
import { getPrefs } from "@/lib/prefs";
import { getHouseBySlug } from "@/lib/houses";
import { getBaseUrl } from "@/lib/site";
import { MOCK_RESIDENT } from "@/lib/portal-mock";
import { PortalLogo } from "@/components/portal/PortalLogo";
import { HiddenOn, MobileTabBar, SidebarNav } from "@/components/portal/PortalNav";
import { RightPanel } from "@/components/portal/RightPanel";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";

// Geometric sans close to the portal's typeface; Oswald for the condensed wordmark.
const jost = Jost({ subsets: ["latin", "latin-ext"], variable: "--font-jost", display: "swap" });
const oswald = Oswald({ subsets: ["latin", "latin-ext"], weight: ["300", "400"], variable: "--font-oswald", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    metadataBase: new URL(getBaseUrl()),
    title: { default: t.portal.logoLabel, template: `%s · ${t.portal.logoLabel}` },
    description: t.meta.description,
    openGraph: { siteName: t.meta.siteName, type: "website" },
    alternates: { types: { "text/calendar": "/api/calendar.ics" } },
  };
}

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const [user, prefs] = await Promise.all([getCurrentUser(), getPrefs()]);
  const homeHouse = prefs.home ? await getHouseBySlug(prefs.home, locale) : null;
  const initials = MOCK_RESIDENT.firstName[0] + MOCK_RESIDENT.lastName[0];
  const organiser = user ? { admin: user.role === "ADMIN" } : null;

  return (
    <html lang={locale} className={`${jost.variable} ${oswald.variable}`}>
      <body>
        <I18nProvider locale={locale} messages={t}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-brand focus:px-5 focus:py-3 focus:font-semibold focus:text-ink"
          >
            {t.common.skipToContent}
          </a>

          <div className="md:flex">
            {/* Left column: logo, menu, footer links */}
            <aside className="hidden w-64 shrink-0 flex-col bg-surface px-5 py-7 md:sticky md:top-0 md:flex md:h-dvh md:overflow-y-auto lg:w-72 lg:px-7">
              <Link href="/" className="mb-10 block px-2 no-underline">
                <PortalLogo label={t.portal.logoLabel} />
              </Link>
              <SidebarNav initials={initials} organiser={organiser} />
              <div className="mt-auto flex flex-col items-center gap-3 pt-10 text-sm text-muted">
                <LanguageSwitch />
                <span>{t.portal.faq}</span>
                <span>{t.portal.privacy}</span>
                <span>{t.portal.legal}</span>
              </div>
            </aside>

            {/* Phone header, as in the residents' app */}
            <header className="flex items-center justify-between gap-2 bg-surface px-4 pb-2 pt-[max(env(safe-area-inset-top),16px)] md:hidden">
              <Link href="/" className="no-underline">
                <PortalLogo label={t.portal.logoLabel} compact />
              </Link>
              <nav aria-label={t.portal.nav} className="-mr-2 flex items-center">
                {[
                  { href: "/notifications", label: t.portal.notifications, icon: Bell, dot: true },
                  { href: "/map", label: t.portal.map, icon: Compass },
                  { href: "/directory", label: t.portal.directory, icon: Contact },
                  { href: "/search", label: t.portal.search, icon: Search },
                ].map(({ href, label, icon: Icon, dot }) => (
                  <Link key={href} href={href} aria-label={label} className="relative inline-flex size-11 items-center justify-center text-ink">
                    <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
                    {dot && <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e5484d]" aria-hidden="true" />}
                  </Link>
                ))}
              </nav>
            </header>

            <main
              id="main"
              tabIndex={-1}
              className="@container min-h-dvh min-w-0 flex-1 bg-surface px-4 pb-32 pt-4 outline-none sm:px-8 md:bg-transparent md:pb-12 md:pt-10 lg:px-12"
            >
              {children}
              {/* On phones the language switch sits at the end of every page (the header holds the app's icons). */}
              <div className="mt-10 flex justify-center md:hidden">
                <LanguageSwitch />
              </div>
            </main>

            {/* Right column: account, house, help */}
            <HiddenOn prefixes={["/calendar"]}>
              <aside className="hidden w-[380px] shrink-0 bg-surface px-7 py-7 xl:sticky xl:top-0 xl:block xl:h-dvh xl:overflow-y-auto">
              <RightPanel signedIn={!!user} home={homeHouse ? { slug: homeHouse.house.slug, name: homeHouse.house.name } : null} />
            </aside>
            </HiddenOn>
          </div>

          <MobileTabBar initials={initials} />
        </I18nProvider>
      </body>
    </html>
  );
}
