"use server";

import { db } from "@/lib/db";
import { sendMailSafely } from "@/lib/email";
import { subscribeConfirmationEmail } from "@/lib/email-templates";
import { getLocale } from "@/lib/i18n/server";
import { emailSchema } from "@/lib/validation";

export type SubscribeState = { status?: "sent" | "invalid" | "error" };

const COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Double opt-in sign-up for the weekly email. The response is identical whether or not
 * the address is already subscribed, so the form cannot be used to probe who subscribed.
 */
export async function subscribeAction(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return { status: "invalid" };
  const email = parsed.data;
  const locale = await getLocale();

  try {
    const existing = await db.subscriber.findUnique({ where: { email } });
    if (existing?.confirmedAt) return { status: "sent" };
    if (existing?.confirmationSentAt && Date.now() - existing.confirmationSentAt.getTime() < COOLDOWN_MS) {
      return { status: "sent" };
    }
    const subscriber = await db.subscriber.upsert({
      where: { email },
      update: { locale, confirmationSentAt: new Date() },
      create: { email, locale, confirmationSentAt: new Date() },
    });
    await sendMailSafely(subscribeConfirmationEmail(email, subscriber.token, locale));
    return { status: "sent" };
  } catch (error) {
    console.error("[subscribe] failed", error);
    return { status: "error" };
  }
}

/** Used by the confirmation / unsubscribe pages (token = the secret in the emailed link). */
export async function confirmSubscriptionAction(token: string): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const res = await db.subscriber.updateMany({
    where: { token },
    data: { confirmedAt: new Date() },
  });
  return res.count > 0;
}

export async function unsubscribeAction(token: string): Promise<boolean> {
  if (typeof token !== "string" || !token) return false;
  const res = await db.subscriber.deleteMany({ where: { token } });
  return res.count > 0;
}
