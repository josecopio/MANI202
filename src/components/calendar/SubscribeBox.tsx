"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarSync, Check, Copy, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { subscribeAction, type SubscribeState } from "@/actions/subscribe";

export function SubscribeBox({ initialBaseUrl, categories }: { initialBaseUrl: string; categories: string[] }) {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<SubscribeState, FormData>(subscribeAction, {});

  // Show the URL the visitor actually used (the server only knows the configured APP_URL).
  useEffect(() => setBaseUrl(window.location.origin), []);

  const query = categories.length ? `?category=${categories.join(",")}` : "";
  const feedUrl = `${baseUrl}/api/calendar.ics${query}`;
  const webcal = feedUrl.replace(/^https?:/, "webcal:");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable: the field is selectable */
    }
  };

  const message =
    state.status === "sent"
      ? t.subscribe.success
      : state.status === "invalid"
        ? t.signin.emailInvalid
        : state.status === "error"
          ? t.subscribe.error
          : null;

  return (
    <section aria-labelledby="subscribe-heading" className="card bg-accent-soft p-4 sm:p-5">
      <h2 id="subscribe-heading" className="font-heading text-xl font-bold">
        {t.subscribe.title}
      </h2>
      <p className="mt-1 text-sm text-muted">{t.subscribe.intro}</p>

      <div className="mt-4">
        <h3 className="flex items-center gap-2 font-sans text-base font-semibold">
          <CalendarSync size={18} aria-hidden="true" />
          {t.subscribe.calendarTitle}
        </h3>
        <p className="mt-1 text-sm text-muted">{t.subscribe.calendarHelp}</p>
        <label htmlFor="feed-url" className="sr-only">
          {t.subscribe.calendarLink}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="feed-url"
            readOnly
            value={feedUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="input min-w-0 flex-1 text-sm"
          />
          <button type="button" onClick={copy} className="btn btn-secondary shrink-0" aria-label={t.subscribe.copyLink}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            <span className="hidden sm:inline">{copied ? t.subscribe.linkCopied : t.common.copy}</span>
          </button>
        </div>
        <p className="sr-only" role="status">
          {copied ? t.subscribe.linkCopied : ""}
        </p>
        <a href={webcal} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-2">
          {t.subscribe.openInApp}
        </a>
        {categories.length > 0 && <p className="text-sm text-muted">{t.subscribe.filterNote}</p>}
      </div>

      <hr className="my-4 border-line" />

      <form action={formAction} noValidate>
        <h3 className="flex items-center gap-2 font-sans text-base font-semibold">
          <Mail size={18} aria-hidden="true" />
          {t.subscribe.emailTitle}
        </h3>
        <p className="mt-1 text-sm text-muted">{t.subscribe.emailHelp}</p>
        <label htmlFor="subscribe-email" className="label mt-3">
          {t.subscribe.emailLabel}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="subscribe-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="input min-w-0 flex-1"
            aria-invalid={state.status === "invalid" ? true : undefined}
            aria-describedby="subscribe-message"
          />
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? t.subscribe.sending : t.subscribe.emailButton}
          </button>
        </div>
        <p
          id="subscribe-message"
          role="status"
          className={`mt-2 text-sm font-medium ${state.status === "sent" ? "text-accent" : "text-danger"}`}
        >
          {message}
        </p>
      </form>
    </section>
  );
}
