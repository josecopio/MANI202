"use client";

import { audienceLabel, impactLabel } from "@/lib/restrictions";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ExternalLink, MapPin, Pencil, Repeat, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { approveEventAction, rejectEventAction } from "@/actions/admin";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { formatDayLong, formatTime } from "@/lib/dates";
import { fmt } from "@/lib/utils";

export type ReviewEvent = {
  id: string;
  title: string;
  description: string;
  dayKey: string;
  startAt: string;
  endAt: string;
  place: string;
  category: { name: string; color: string; bgColor: string };
  audience: "RESIDENTS_ONLY" | "PUBLIC" | "HOUSE_ONLY";
  houseName: string | null;
  spaceImpact: "NONE" | "LIMITED" | "CLOSED";
  restrictionNote: string | null;
  organiserName: string;
  contactEmail: string;
  submittedBy: string;
  registrationUrl: string | null;
  imageUrl: string | null;
  recurrenceLabel: string | null;
  isSample: boolean;
};

export function ReviewCard({ event }: { event: ReviewEvent }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const approve = () =>
    startTransition(async () => {
      setError(null);
      const res = await approveEventAction(event.id);
      if (res.ok) router.refresh();
      else setError(t.common.genericError);
    });

  const reject = () =>
    startTransition(async () => {
      setError(null);
      const res = await rejectEventAction(event.id, reason);
      if (res.ok) router.refresh();
      else {
        setError(res.fields?.reason ? t.errors.reason_short : t.common.genericError);
        reasonRef.current?.focus();
      }
    });

  const titleId = `review-${event.id}`;
  return (
    <li className="card p-4 sm:p-5">
      <article aria-labelledby={titleId}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id={titleId} className="font-sans text-lg font-semibold">{event.title}</h3>
            <p className="mt-1 text-sm text-muted">
              <span className="first-letter:uppercase">{formatDayLong(event.dayKey, locale)}</span>, {formatTime(event.startAt, locale)}–{formatTime(event.endAt, locale)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
              <MapPin size={14} aria-hidden="true" /> {event.place}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryTag category={event.category} />
            {event.isSample && <span className="badge bg-neutral-soft text-muted">{t.calendar.sample}</span>}
          </div>
        </div>

        <p className="mt-3 whitespace-pre-line">{event.description}</p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div><dt className="inline font-semibold">{t.card.organiser} : </dt><dd className="inline text-muted">{event.organiserName}</dd></div>
          <div><dt className="inline font-semibold">{t.restrictions.accessLabel} : </dt><dd className="inline text-muted">{audienceLabel(t, event)}</dd></div>
          <div><dt className="inline font-semibold">{t.detail.contact} : </dt><dd className="inline text-muted">{event.contactEmail}</dd></div>
        </dl>
        {(event.spaceImpact !== "NONE" || event.restrictionNote) && (
          <p className="mt-2 rounded-control bg-warn-soft p-2 text-sm text-warn">
            {impactLabel(t, event.spaceImpact)}{event.spaceImpact !== "NONE" && event.restrictionNote ? " — " : ""}{event.restrictionNote}
          </p>
        )}
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p>{fmt(t.admin.submittedBy, { email: event.submittedBy })}</p>
          {event.recurrenceLabel && (
            <p className="flex items-center gap-1"><Repeat size={14} aria-hidden="true" />{event.recurrenceLabel}</p>
          )}
          {event.registrationUrl && (
            <p>
              <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent underline underline-offset-2">
                <ExternalLink size={14} aria-hidden="true" />{event.registrationUrl}
              </a>
            </p>
          )}
        </div>

        {rejecting ? (
          <div className="mt-4 rounded-control bg-danger-soft p-4">
            <label htmlFor={`reason-${event.id}`} className="label">{t.admin.rejectReason}</label>
            <textarea
              id={`reason-${event.id}`}
              ref={reasonRef}
              className="input"
              rows={3}
              value={reason}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              aria-describedby={`reason-hint-${event.id}`}
              aria-invalid={error ? true : undefined}
            />
            <p id={`reason-hint-${event.id}`} className="hint mt-1.5">{t.admin.rejectReasonHint}</p>
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-danger-solid btn-sm" onClick={reject} disabled={pending}>
                <X size={16} aria-hidden="true" />{t.admin.rejectConfirm}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setRejecting(false); setError(null); }}>{t.common.cancel}</button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={approve} disabled={pending}>
              <Check size={16} aria-hidden="true" />{t.admin.approve}<span className="sr-only">: {event.title}</span>
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setRejecting(true)} disabled={pending}>
              <X size={16} aria-hidden="true" />{t.admin.reject}<span className="sr-only">: {event.title}</span>
            </button>
            <Link href={`/admin/events/${event.id}/edit`} className="btn btn-secondary btn-sm">
              <Pencil size={16} aria-hidden="true" />{t.admin.edit}<span className="sr-only">: {event.title}</span>
            </Link>
            {error && <p role="alert" className="field-error self-center">{error}</p>}
          </div>
        )}
      </article>
    </li>
  );
}
