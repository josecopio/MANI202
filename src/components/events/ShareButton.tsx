"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";

export function ShareButton({ title }: { title: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* dismissed: fall through to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <button type="button" onClick={share} className="btn btn-secondary btn-sm">
        {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        {copied ? t.detail.linkCopied : t.detail.share}
      </button>
      <span role="status" className="sr-only">{copied ? t.detail.linkCopied : ""}</span>
    </>
  );
}
