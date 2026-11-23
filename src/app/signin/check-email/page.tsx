import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogIn, MailCheck } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { DEMO_LINK_COOKIE, isDemoMode, isSignInLink } from "@/lib/demo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.signin.checkTitle, robots: { index: false } };
}

export default async function CheckEmailPage() {
  const { t } = await getI18n();

  if (isDemoMode()) {
    const link = (await cookies()).get(DEMO_LINK_COOKIE)?.value;
    return (
      <div className="mx-auto max-w-lg">
        <div className="card p-6 text-center sm:p-8">
          <MailCheck size={40} className="mx-auto text-accent" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">{t.signin.demoLinkTitle}</h1>
          {isSignInLink(link) ? (
            <>
              <p className="mt-2">{t.signin.demoLinkBody}</p>
              <a href={link} className="btn btn-primary mt-6">
                <LogIn size={18} aria-hidden="true" />
                {t.signin.demoLinkButton}
              </a>
            </>
          ) : (
            <p role="alert" className="mt-2">{t.signin.demoLinkMissing}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 text-center sm:p-8">
        <MailCheck size={40} className="mx-auto text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">{t.signin.checkTitle}</h1>
        <p className="mt-2">{t.signin.checkBody}</p>
        <p className="mt-2 text-sm text-muted">{t.signin.checkSpam}</p>
      </div>
    </div>
  );
}
