"use client";

import { useEffect, useState } from "react";
import { CalendarSync, Check, Copy } from "lucide-react";
import { fmt } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/** Buttons that subscribe Google, Apple and Outlook calendars to the resident's restriction feed. */
export type CalendarPreview = { day: string; time: string; label: string; closed: boolean };

export function CalendarConnect({
  initialBaseUrl,
  feedQuery,
  demo = false,
  preview = [],
}: {
  initialBaseUrl: string;
  feedQuery: string;
  /** Video demo mode: show a mocked subscription sheet instead of leaving for the calendar app. */
  demo?: boolean;
  preview?: CalendarPreview[];
}) {
  const { locale, t } = useI18n();
  const [sheet, setSheet] = useState<{ provider: string; step: "ask" | "done" } | null>(null);
  const [connected, setConnected] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [copied, setCopied] = useState(false);

  // Use the address the visitor actually used (the server only knows the configured APP_URL).
  useEffect(() => setBaseUrl(window.location.origin), []);

  const feedUrl = `${baseUrl}/api/calendar.ics${feedQuery ? `?${feedQuery}` : ""}`;
  const webcal = feedUrl.replace(/^https?:/, "webcal:");
  const name = t.meta.personalCalendarName;
  const links = [
    { label: "Google Agenda", labelEn: "Google Calendar", href: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`, external: true },
    { label: "Apple Calendrier", labelEn: "Apple Calendar", href: webcal, external: false },
    {
      label: "Outlook",
      labelEn: "Outlook",
      href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(name)}`,
      external: true,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section aria-labelledby="connect-title" className="flex flex-col gap-5 rounded-[32px] panel p-6 sm:p-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
          <CalendarSync size={24} />
        </span>
        <div>
          <h2 id="connect-title" className="text-xl font-semibold">{t.access.connectTitle}</h2>
                  </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn btn-primary"
            onClick={(ev) => {
              if (!demo) return;
              ev.preventDefault();
              setSheet({ provider: locale === "fr" ? l.label : l.labelEn, step: "ask" });
            }}
          >
            {connected === (locale === "fr" ? l.label : l.labelEn) && <Check size={18} aria-hidden="true" />}
            {locale === "fr" ? l.label : l.labelEn}
          </a>
        ))}
        <button type="button" onClick={copy} className="btn btn-secondary">
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? t.subscribe.linkCopied : t.access.copyLink}
        </button>
        <span className="sr-only" role="status">{copied ? t.subscribe.linkCopied : ""}</span>
      </div>
      {sheet && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-3 pb-8 animate-[fade_.2s_ease-out]" role="dialog" aria-modal="true">
          <style>{`@keyframes fade{from{opacity:0}}@keyframes rise{from{transform:translateY(40px);opacity:0}}`}</style>
          <div className="w-full max-w-md rounded-[28px] bg-surface p-6 shadow-2xl animate-[rise_.3s_cubic-bezier(.2,.9,.25,1.1)]">
            {sheet.step === "ask" ? (
              <>
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <CalendarSync size={28} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-center text-xl font-semibold">{t.demo.subscribeTitle}</h3>
                <p className="mt-1 text-center font-medium">{name}</p>
                <p className="mt-2 text-center text-muted">{fmt(t.demo.subscribeBody, { provider: sheet.provider })}</p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setSheet(null)}>{t.common.cancel}</button>
                  <button type="button" id="demo-subscribe" className="btn btn-primary" onClick={() => { setSheet({ ...sheet, step: "done" }); setConnected(sheet.provider); }}>
                    {t.demo.subscribe}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent text-white">
                  <Check size={30} strokeWidth={3} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-center text-xl font-semibold">{t.demo.subscribedTitle}</h3>
                <p className="mt-1 text-center text-muted">{fmt(t.demo.subscribedBody, { provider: sheet.provider })}</p>
                <ul className="mt-4 space-y-2">
                  {preview.map((p, i) => (
                    <li key={i} className="flex gap-3 rounded-xl bg-bg p-3">
                      <span className={`w-1 shrink-0 rounded-full ${p.closed ? "bg-danger" : "bg-[#d9a400]"}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold capitalize">{p.day} · {p.time}</span>
                        <span className="block text-sm text-muted">{p.label}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <button type="button" id="demo-done" className="btn btn-primary mt-5 w-full" onClick={() => setSheet(null)}>{t.demo.done}</button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
