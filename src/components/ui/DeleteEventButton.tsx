"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { deleteEventAction } from "@/actions/events";
import { fmt } from "@/lib/utils";

/** Delete with a native <dialog> confirmation (focus trap and Escape handled by the browser). */
export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const res = await deleteEventAction(eventId);
      dialog.current?.close();
      if (res.ok) router.refresh();
    });

  return (
    <>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => dialog.current?.showModal()}>
        <Trash2 size={16} aria-hidden="true" />
        {t.common.delete}
        <span className="sr-only">: {title}</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={`del-${eventId}`}
        className="m-auto w-[min(92vw,440px)] rounded-card border border-line bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40"
      >
        <h2 id={`del-${eventId}`} className="font-heading text-xl font-bold">{t.myEvents.confirmDeleteTitle}</h2>
        <p className="mt-2 text-muted">{fmt(t.myEvents.confirmDeleteBody, { title })}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()} autoFocus>
            {t.common.cancel}
          </button>
          <button type="button" className="btn btn-danger-solid" onClick={confirm} disabled={pending}>
            {t.common.delete}
          </button>
        </div>
      </dialog>
    </>
  );
}
