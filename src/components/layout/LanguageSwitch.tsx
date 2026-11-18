"use client";

import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { setLocaleAction } from "@/actions/session";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
    });
  };

  return (
    <div role="group" aria-label={t.header.language} className="inline-flex rounded-pill border border-field bg-surface p-0.5">
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          disabled={pending}
          onClick={() => choose(l)}
          className={cn(
            "min-h-11 min-w-11 rounded-pill px-3 text-sm font-bold tracking-wide transition-colors",
            locale === l ? "bg-accent text-white" : "text-ink hover:bg-accent-soft",
          )}
        >
          {l.toUpperCase()}
          <span className="sr-only"> – {l === "fr" ? t.header.langFr : t.header.langEn}</span>
        </button>
      ))}
    </div>
  );
}
