import Link from "next/link";
import { Bell, CircleHelp, Link2, LogIn, LogOut, Search } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { signOutAction } from "@/actions/session";
import { CIUP_ADDRESS, MOCK_RESIDENT } from "@/lib/portal-mock";
import { Avatar } from "./PortalNav";

type Props = {
  signedIn: boolean;
  home: { slug: string; name: string } | null;
};

/** Right column of the portal: account shortcuts, profile, the resident's house and help. */
export async function RightPanel({ signedIn, home }: Props) {
  const { t } = await getI18n();
  const initials = MOCK_RESIDENT.firstName[0] + MOCK_RESIDENT.lastName[0];
  const logoutClass = "inline-flex min-h-11 items-center gap-2 text-[17px] font-medium text-accent no-underline";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/notifications" className="relative inline-flex size-11 items-center justify-center rounded-full hover:bg-bg" aria-label={t.portal.notifications}>
          <Bell size={24} strokeWidth={1.5} aria-hidden="true" />
          <span className="absolute right-2.5 top-2 size-2 rounded-full bg-[#e5484d]" aria-hidden="true" />
        </Link>
        <Link href="/search" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-bg" aria-label={t.portal.search}>
          <Search size={24} strokeWidth={1.5} aria-hidden="true" />
        </Link>
        <div className="ml-auto">
          {signedIn ? (
            <form action={signOutAction}>
              <button type="submit" className={logoutClass}>
                {t.portal.logout}
                <LogOut size={20} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <Link href="/signin" className={logoutClass}>
              {t.header.signIn}
              <LogIn size={20} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 px-2 pt-4">
        <Avatar initials={initials} size={88} />
        <div>
          <p className="font-heading text-xl font-bold uppercase leading-tight">{MOCK_RESIDENT.lastName}</p>
          <p className="font-heading text-xl font-bold leading-tight">{MOCK_RESIDENT.firstName}</p>
          <Link href="/profile" className="mt-2 inline-block font-medium text-accent no-underline hover:underline">
            {t.portal.seeProfile}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 text-center" aria-hidden="true">
        <span className="rounded-pill bg-accent-soft py-2 font-medium text-accent">{t.portal.resident}</span>
        <span className="py-2">{t.portal.alumni}</span>
      </div>

      <div className="relative overflow-hidden rounded-[32px] bg-[#8b67ae] p-7 text-white">
        <svg viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-16 -left-10 h-64 w-64 opacity-15" aria-hidden="true">
          {[90, 72, 54, 36, 18].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeWidth="7" />
          ))}
        </svg>
        <div className="relative">
          {home ? (
            <>
              <p className="font-heading text-2xl font-semibold leading-snug">{home.name}</p>
              <p className="mt-4 text-sm uppercase">{CIUP_ADDRESS}</p>
              <Link
                href="/calendar"
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-white no-underline hover:underline"
              >
                <Link2 size={22} aria-hidden="true" />
                {t.portal.houseLink}
              </Link>
            </>
          ) : (
            <Link href="/calendar" className="font-heading text-xl font-semibold text-white no-underline hover:underline">
              {t.portal.noHouse}
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 rounded-[32px] bg-brand p-7 text-ink">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-accent">
          <CircleHelp size={24} aria-hidden="true" />
        </span>
        <div>
          <p className="font-heading text-lg font-semibold">{t.portal.helpTitle}</p>
          <p className="text-sm italic">{t.portal.helpBody}</p>
        </div>
      </div>
    </div>
  );
}
