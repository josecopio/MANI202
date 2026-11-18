"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Home, Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { savePrefsAction } from "@/actions/prefs";
import type { HouseView } from "@/lib/houses";
import type { CategoryView } from "@/lib/queries";
import type { Prefs } from "@/lib/prefs-shared";
import { cn } from "@/lib/utils";

type Props = {
  houses: HouseView[];
  categories: CategoryView[];
  initial: Prefs;
  /** "onboarding": first visit, leads to the calendar. "settings": stays on the page. */
  mode: "onboarding" | "settings";
};

/** Chooses the resident's house, the other houses they use, and their general interests. */
export function PrefsForm({ houses, categories, initial, mode }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [home, setHome] = useState<string | null>(initial.home);
  const [others, setOthers] = useState<string[]>(initial.houses);
  // Before the first save every category is on: the resident narrows it down.
  const [interests, setInterests] = useState<string[]>(initial.configured ? initial.interests : categories.map((c) => c.slug));
  const [general, setGeneral] = useState(initial.general);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const residences = houses.filter((h) => h.isResidence);
  const toggle = (list: string[], slug: string) => (list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);

  const save = () => {
    setStatus("idle");
    startTransition(async () => {
      const result = await savePrefsAction({ home, houses: others.filter((s) => s !== home), interests, general });
      if (!result.ok) return setStatus("error");
      if (mode === "onboarding") router.push("/");
      else {
        setStatus("saved");
        router.refresh();
      }
    });
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      {/* 1. Home house */}
      <fieldset>
        <legend className="font-heading text-xl font-bold">{t.prefs.homeTitle}</legend>
        <p className="mt-1 text-muted">{t.prefs.homeHint}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {residences.map((h) => {
            const on = home === h.slug;
            return (
              <label
                key={h.slug}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border bg-surface p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                  on ? "border-brand-strong bg-accent-soft" : "border-field hover:border-brand-strong",
                )}
              >
                <input type="radio" name="home" className="sr-only" checked={on} onChange={() => setHome(h.slug)} />
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: h.color }}>
                  {on ? <Check size={16} /> : <Home size={16} />}
                </span>
                <span className="font-semibold leading-snug">{h.name}</span>
              </label>
            );
          })}
          <label
            className={cn(
              "flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-dashed bg-surface p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              home === null ? "border-brand-strong bg-accent-soft" : "border-field",
            )}
          >
            <input type="radio" name="home" className="sr-only" checked={home === null} onChange={() => setHome(null)} />
            <span className="font-medium text-muted">{t.prefs.homeNone}</span>
          </label>
        </div>
      </fieldset>

      {/* 2. Other houses */}
      <fieldset>
        <legend className="font-heading text-xl font-bold">{t.prefs.othersTitle}</legend>
        <p className="mt-1 text-muted">{t.prefs.othersHint}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {houses
            .filter((h) => h.slug !== home)
            .map((h) => {
              const on = others.includes(h.slug);
              return (
                <label
                  key={h.slug}
                  className="pill has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                  style={on ? { backgroundColor: "#47D7AC", borderColor: "#47D7AC", color: "#1E2023" } : undefined}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => setOthers(toggle(others, h.slug))} />
                  {on ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: h.color }} />}
                  {h.name}
                </label>
              );
            })}
        </div>
      </fieldset>

      {/* 3. General interests */}
      <fieldset>
        <legend className="font-heading text-xl font-bold">{t.prefs.interestsTitle}</legend>
        <p className="mt-1 text-muted">{t.prefs.interestsHint}</p>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" className="h-6 w-6 accent-[#0a7d5e]" checked={general} onChange={(e) => setGeneral(e.target.checked)} />
          {t.prefs.generalLabel}
        </label>
        <div className={cn("mt-3 flex flex-wrap gap-2", !general && "opacity-50")}>
          {categories.map((c) => {
            const on = interests.includes(c.slug);
            return (
              <label
                key={c.slug}
                className="pill has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
                style={on ? { backgroundColor: c.bgColor, borderColor: c.color, color: c.color } : undefined}
              >
                <input type="checkbox" className="sr-only" disabled={!general} checked={on} onChange={() => setInterests(toggle(interests, c.slug))} />
                {on ? <Check size={16} aria-hidden="true" /> : <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />}
                {c.name}
              </label>
            );
          })}
          <button type="button" className="btn btn-ghost btn-sm" disabled={!general} onClick={() => setInterests(interests.length === categories.length ? [] : categories.map((c) => c.slug))}>
            {interests.length === categories.length ? t.prefs.noInterests : t.prefs.allInterests}
          </button>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t.prefs.saving : mode === "onboarding" ? t.prefs.saveOnboarding : t.prefs.saveSettings}
        </button>
        {mode === "onboarding" && (
          <a href="/explore" className="btn btn-ghost">
            {t.prefs.skip}
          </a>
        )}
        <p role="status" className={cn("text-sm font-medium", status === "error" ? "text-danger" : "text-accent")}>
          {status === "saved" ? t.prefs.saved : status === "error" ? t.prefs.error : ""}
        </p>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Lock size={14} aria-hidden="true" />
        {t.prefs.deviceNote}
      </p>
    </form>
  );
}
