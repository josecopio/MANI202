"use client";

import { useI18n } from "@/lib/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto max-w-lg py-12 text-center">
      <h1 className="text-3xl font-bold">{t.common.errorTitle}</h1>
      <p className="mt-2 text-muted">{t.common.genericError}</p>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">{t.common.retry}</button>
    </div>
  );
}
