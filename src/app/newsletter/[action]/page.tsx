import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MailCheck, MailX } from "lucide-react";
import { db } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { fmt } from "@/lib/utils";
import { confirmSubscriptionAction, unsubscribeAction } from "@/actions/subscribe";

export const metadata: Metadata = { robots: { index: false } };

/**
 * The emailed link only shows a button: confirming / unsubscribing is a POST, so link
 * scanners that prefetch URLs cannot unsubscribe people by accident.
 */
export default async function NewsletterPage({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }>;
  searchParams: Promise<{ token?: string; done?: string }>;
}) {
  const { action } = await params;
  if (action !== "confirm" && action !== "unsubscribe") notFound();
  const { token = "", done } = await searchParams;
  const { t } = await getI18n();
  const subscriber = token ? await db.subscriber.findUnique({ where: { token } }) : null;

  const run = async () => {
    "use server";
    const ok = action === "confirm" ? await confirmSubscriptionAction(token) : await unsubscribeAction(token);
    redirect(`/newsletter/${action}?token=${encodeURIComponent(token)}&done=${ok ? "1" : "0"}`);
  };

  const confirm = action === "confirm";
  let title: string;
  let body: string;
  let showButton = false;
  if (done === "1") {
    title = confirm ? t.newsletter.confirmedTitle : t.newsletter.unsubscribedTitle;
    body = confirm ? t.newsletter.confirmedBody : t.newsletter.unsubscribedBody;
  } else if (!subscriber) {
    // After unsubscribing the record is gone, so a reload shows the neutral "invalid link" page.
    title = t.newsletter.invalidTitle;
    body = t.newsletter.invalidBody;
  } else {
    title = confirm ? t.newsletter.confirmTitle : t.newsletter.unsubscribeTitle;
    body = fmt(confirm ? t.newsletter.confirmBody : t.newsletter.unsubscribeBody, { email: subscriber.email });
    showButton = true;
  }

  const Icon = !confirm && done === "1" ? MailX : MailCheck;
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6 text-center sm:p-8">
        <Icon size={40} className="mx-auto text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
        {showButton && (
          <form action={run} className="mt-6">
            <button type="submit" className="btn btn-primary">
              {confirm ? t.newsletter.confirmButton : t.newsletter.unsubscribeButton}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
