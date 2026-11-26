"use client";

import { useEffect, useState } from "react";
import { CalendarSync, Check, Copy } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

/** Buttons that subscribe Google, Apple and Outlook calendars to the resident's restriction feed. */
export function CalendarConnect({ initialBaseUrl, feedQuery }: { initialBaseUrl: string; feedQuery: string }) {
  const { locale, t } = useI18n();
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
          >
            {locale === "fr" ? l.label : l.labelEn}
          </a>
        ))}
        <button type="button" onClick={copy} className="btn btn-secondary">
          {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
          {copied ? t.subscribe.linkCopied : t.access.copyLink}
        </button>
        <span className="sr-only" role="status">{copied ? t.subscribe.linkCopied : ""}</span>
      </div>
    </section>
  );
}
