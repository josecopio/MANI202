"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { savePrefsAction } from "@/actions/prefs";
import type { HouseView } from "@/lib/houses";
import type { Prefs } from "@/lib/prefs-shared";
import { cn } from "@/lib/utils";

const focusRing =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

/** Chooses the resident's house and the other houses they use. */
export function PrefsForm({ houses, initial, onSaved }: { houses: HouseView[]; initial: Prefs; onSaved?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [home, setHome] = useState<string | null>(initial.home);
  const [others, setOthers] = useState<string[]>(initial.houses);
  const [error, setError] = useState(false);

  const residences = houses.filter((h) => h.isResidence);
  const toggle = (slug: string) => setOthers((list) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]));

  const save = () => {
    setError(false);
    startTransition(async () => {
      const result = await savePrefsAction({ home, houses: others.filter((s) => s !== home), interests: [], general: false });
      if (!result.ok) return setError(true);
      router.refresh();
      onSaved?.();
    });
  };

  return (
    <form
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <fieldset>
        <legend className="font-heading text-lg font-semibold">{t.prefs.homeTitle}</legend>
        <div className="mt-3 grid gap-2 @lg:grid-cols-2">
          {residences.map((h) => {
            const on = home === h.slug;
            return (
              <label
                key={h.slug}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border bg-surface px-3 py-2 transition-colors",
                  focusRing,
                  on ? "border-brand-strong bg-accent-soft" : "border-line hover:border-brand-strong",
                )}
              >
                <input type="radio" name="home" className="sr-only" checked={on} onChange={() => setHome(h.slug)} />
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: h.color }}>
                  {on ? <Check size={14} /> : <Home size={14} />}
                </span>
                <span className="font-medium leading-snug">{h.name}</span>
              </label>
            );
          })}
          <label
            className={cn(
              "flex min-h-12 cursor-pointer items-center rounded-2xl border border-dashed bg-surface px-3 py-2",
              focusRing,
              home === null ? "border-brand-strong bg-accent-soft" : "border-line",
            )}
          >
            <input type="radio" name="home" className="sr-only" checked={home === null} onChange={() => setHome(null)} />
            <span className="text-muted">{t.prefs.homeNone}</span>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-heading text-lg font-semibold">{t.prefs.othersTitle}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {houses
            .filter((h) => h.slug !== home)
            .map((h) => {
              const on = others.includes(h.slug);
              return (
                <label key={h.slug} className={cn("pill", focusRing, on && "!border-brand !bg-brand !text-ink")}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(h.slug)} />
                  {on ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                  )}
                  {h.name}
                </label>
              );
            })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t.prefs.saving : t.prefs.saveSettings}
        </button>
        <p role="status" className="text-sm font-medium text-danger">
          {error ? t.prefs.error : ""}
        </p>
      </div>
      <p className="text-sm text-muted">{t.prefs.deviceNote}</p>
    </form>
  );
}
