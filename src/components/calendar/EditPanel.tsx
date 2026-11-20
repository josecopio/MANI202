"use client";

import { useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import type { HouseView } from "@/lib/houses";
import type { Prefs } from "@/lib/prefs-shared";
import { PrefsForm } from "@/components/prefs/PrefsForm";

/** "Edit" button: every selection feature of the calendar lives behind it, in a dialog. */
export function EditPanel({
  houses,
  prefs,
}: {
  houses: HouseView[];
  prefs: Prefs;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => ref.current?.showModal()}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        {t.access.edit}
      </button>
      <dialog
        ref={ref}
        aria-labelledby="edit-title"
        className="mb-0 mt-auto max-h-[92dvh] w-full max-w-full rounded-t-[28px] bg-surface p-0 pb-[env(safe-area-inset-bottom)] text-ink backdrop:bg-ink/40 md:m-auto md:max-h-[90dvh] md:w-[min(720px,calc(100vw-32px))] md:rounded-[28px] md:pb-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // click on the backdrop
        }}
      >
        <div className="@container p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="edit-title" className="text-2xl font-semibold">{t.access.editTitle}</h2>
              <p className="mt-1 text-muted">{t.access.editIntro}</p>
            </div>
            <button type="button" onClick={close} className="btn btn-ghost -mr-2 -mt-2 shrink-0 !px-3" aria-label={t.common.close}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6">
            <PrefsForm houses={houses} initial={prefs} onSaved={close} />
          </div>
        </div>
      </dialog>
    </>
  );
}
