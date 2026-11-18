"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { toggleInterestAction } from "@/actions/interest";
import { cn } from "@/lib/utils";

export function InterestButton({ eventId, interested }: { eventId: string; interested: boolean }) {
  const { t } = useI18n();
  const [optimistic, setOptimistic] = useOptimistic(interested, (_current, next: boolean) => next);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setFailed(false);
      setOptimistic(!optimistic);
      const result = await toggleInterestAction(eventId);
      if (!result.ok) setFailed(true);
    });

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={optimistic}
        className={cn("btn btn-sm", optimistic ? "btn-primary" : "btn-secondary")}
      >
        <Star size={16} aria-hidden="true" fill={optimistic ? "currentColor" : "none"} />
        {t.card.interested}
      </button>
      {failed && (
        <span role="alert" className="field-error">
          {t.card.interestedError}
        </span>
      )}
    </span>
  );
}
