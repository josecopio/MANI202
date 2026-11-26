"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

type Status = "loading" | "unsupported" | "unavailable" | "denied" | "off" | "on" | "busy" | "error";

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function register(subscription: PushSubscription, welcome: boolean) {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON(), welcome }),
  });
  if (!res.ok) throw new Error(`push register ${res.status}`);
}

/**
 * Turns on push notifications for this device. The subscription follows the houses chosen
 * on the calendar and the interface language (when either changes, the server copy is refreshed).
 */
export function PushSignup({ publicKey, housesKey, demo = false }: { publicKey: string | null; housesKey: string; /** Video demo: show as turned on. */ demo?: boolean }) {
  const { locale, t } = useI18n();
  const [status, setStatus] = useState<Status>("loading");

  const supported = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  const currentSubscription = useCallback(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return { reg, sub: await reg.pushManager.getSubscription() };
  }, []);

  // Initial state, and keep the server copy in sync with the houses chosen on this device.
  useEffect(() => {
    if (demo) return setStatus("on");
    if (!supported()) return setStatus("unsupported");
    if (!publicKey) return setStatus("unavailable");
    if (Notification.permission === "denied") return setStatus("denied");
    let cancelled = false;
    currentSubscription()
      .then(async ({ sub }) => {
        if (cancelled) return;
        if (sub && Notification.permission === "granted") {
          setStatus("on");
          await register(sub, false).catch(() => {});
        } else setStatus("off");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
    // Re-run when the houses or the language change, so notifications follow both.
  }, [publicKey, housesKey, locale, currentSubscription, demo]);

  const enable = async () => {
    if (!publicKey) return;
    setStatus("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off");
      const { reg, sub } = await currentSubscription();
      const subscription = sub ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      await register(subscription, true);
      setStatus("on");
    } catch {
      setStatus("error");
    }
  };

  const disable = async () => {
    setStatus("busy");
    try {
      const { sub } = await currentSubscription();
      if (sub) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setStatus("error");
    }
  };

  const note =
    status === "on"
      ? t.access.pushOn
      : status === "denied"
        ? t.access.pushDenied
        : status === "unsupported"
          ? t.access.pushUnsupported
          : status === "unavailable"
            ? t.access.pushUnavailable
            : status === "error"
              ? t.access.pushError
              : "";

  return (
    <section aria-labelledby="push-title" className="flex flex-col gap-5 rounded-[32px] panel p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
          <BellRing size={24} />
        </span>
        <div>
          <h2 id="push-title" className="text-xl font-semibold">{t.access.pushTitle}</h2>
                  </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-3">
        {status === "on" ? (
          <button type="button" className="btn btn-secondary" onClick={disable}>
            <BellOff size={18} aria-hidden="true" />
            {t.access.pushDisable}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={enable}
            disabled={status === "loading" || status === "busy" || status === "unsupported" || status === "unavailable" || status === "denied"}
          >
            <BellRing size={18} aria-hidden="true" />
            {status === "busy" ? t.access.pushEnabling : t.access.pushEnable}
          </button>
        )}
        <p role="status" className={`text-sm font-medium ${status === "on" ? "text-accent" : "text-muted"}`}>
          {note}
        </p>
      </div>
    </section>
  );
}
