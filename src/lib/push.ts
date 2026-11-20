import webpush from "web-push";
import { db } from "./db";
import { formatTime, todayKey } from "./dates";
import { getMessagesFor } from "./i18n";
import { getRestrictions, type RestrictionItem } from "./queries";
import { fmt } from "./utils";
import type { Locale } from "./types";

export type PushPayload = { title: string; body: string; url: string; tag: string };
type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

let configured = false;
/** True when VAPID keys are set (push is disabled otherwise). */
export function pushConfigured(): boolean {
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(subject || "mailto:events@example.org", pub, priv);
    configured = true;
  }
  return true;
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** Short notification text for a list of restrictions (at most three lines). */
export function restrictionsPayload(items: RestrictionItem[], locale: Locale, dayKey: string, title?: string): PushPayload {
  const m = getMessagesFor(locale);
  const lines = items.slice(0, 3).map((e) => {
    const status = e.spaceImpact === "CLOSED" ? m.access.closed : m.access.limited;
    const where = [e.houseName, e.space].filter(Boolean).join(" – ");
    return `${status} · ${where}, ${formatTime(e.startAt, locale)}–${formatTime(e.endAt, locale)}`;
  });
  if (items.length > 3) lines.push(fmt(m.access.pushMore, { count: items.length - 3 }));
  return {
    title:
      title ??
      (items.length === 1 ? m.access.pushToday_one : fmt(m.access.pushToday_other, { count: items.length })),
    body: items.length ? lines.join("\n") : m.access.pushNone,
    url: "/calendar",
    tag: `restrictions-${dayKey}`,
  };
}

/** Sends one notification. Subscriptions the push service reports as gone are deleted. */
export async function sendPush(sub: StoredSubscription, payload: PushPayload): Promise<"sent" | "gone" | "failed"> {
  if (!pushConfigured()) return "failed";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 3600, urgency: "normal" },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return "gone";
    }
    console.error("[push] failed for subscription", sub.id, status ?? error);
    return "failed";
  }
}

/**
 * Morning push: every device gets today's access restrictions in the houses it follows.
 * Nothing is sent on days without restrictions.
 */
export async function sendDailyPush(now = new Date()) {
  const result = { sent: 0, skipped: 0, gone: 0, failed: 0 };
  if (!pushConfigured()) return { ...result, error: "VAPID keys missing" };
  const dayKey = todayKey(now);
  const subs = await db.pushSubscription.findMany();
  const cache = new Map<string, RestrictionItem[]>();

  for (const s of subs) {
    const locale: Locale = s.locale === "en" ? "en" : "fr";
    const houses = s.houseSlugs ? s.houseSlugs.split(",").filter(Boolean) : [];
    const key = `${locale}|${houses.join(",")}`;
    if (!cache.has(key)) cache.set(key, await getRestrictions({ fromKey: dayKey, days: 1, houses: houses.length ? houses : null, locale }));
    const items = cache.get(key)!;
    if (items.length === 0) {
      result.skipped++;
      continue;
    }
    const outcome = await sendPush(s, restrictionsPayload(items, locale, dayKey));
    if (outcome === "sent") await db.pushSubscription.update({ where: { id: s.id }, data: { lastSentAt: now } });
    result[outcome]++;
  }
  return result;
}
