import { z } from "zod";
import { db } from "@/lib/db";
import { getLocale } from "@/lib/i18n/server";
import { getPrefs } from "@/lib/prefs";
import { followedHouses } from "@/lib/prefs-shared";
import { getRestrictions } from "@/lib/queries";
import { todayKey } from "@/lib/dates";
import { getMessagesFor } from "@/lib/i18n";
import { pushConfigured, restrictionsPayload, sendPush } from "@/lib/push";

export const dynamic = "force-dynamic";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/**
 * Registers (or refreshes) this device's push subscription with the houses chosen on it.
 * Body: { subscription, welcome?: boolean }. With `welcome`, a first notification is sent
 * right away with today's restrictions, so the resident sees what they will receive.
 */
export async function POST(request: Request) {
  if (!pushConfigured()) return Response.json({ error: "push_disabled" }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { subscription?: unknown; welcome?: unknown } | null;
  const parsed = subscriptionSchema.safeParse(body?.subscription);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const [prefs, locale] = await Promise.all([getPrefs(), getLocale()]);
  const houses = followedHouses(prefs);
  const data = { p256dh: keys.p256dh, auth: keys.auth, houseSlugs: houses.join(","), locale };
  const sub = await db.pushSubscription.upsert({ where: { endpoint }, update: data, create: { endpoint, ...data } });

  if (body?.welcome === true) {
    const dayKey = todayKey();
    const items = await getRestrictions({ fromKey: dayKey, days: 1, houses: houses.length ? houses : null, locale });
    await sendPush(sub, restrictionsPayload(items, locale, dayKey, getMessagesFor(locale).access.pushWelcome));
  }
  return Response.json({ ok: true });
}

/** Removes this device's subscription. Body: { endpoint }. */
export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return Response.json({ error: "invalid" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
  return Response.json({ ok: true });
}
