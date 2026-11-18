import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/permissions";
import { SignInForm } from "@/components/forms/SignInForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.signin.title, robots: { index: false } };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const callbackUrl = sp.callbackUrl && sp.callbackUrl.startsWith("/") && !sp.callbackUrl.startsWith("//") ? sp.callbackUrl : "/";
  if (await getCurrentUser()) redirect(callbackUrl);

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-bold">{t.signin.title}</h1>
        <p className="mt-2 text-muted">{t.signin.intro}</p>
        {sp.error && (
          <div role="alert" className="mt-4 rounded-control bg-danger-soft p-4 text-danger">
            <p className="font-semibold">{t.signin.errorTitle}</p>
            <p>{t.signin.errorBody}</p>
          </div>
        )}
        <div className="mt-6">
          <SignInForm callbackUrl={callbackUrl} />
        </div>
        <p className="mt-6 text-sm text-muted">{t.signin.visitorNote}</p>
      </div>
    </div>
  );
}
