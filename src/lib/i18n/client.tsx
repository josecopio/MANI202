"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "../types";
import type { Messages } from "./fr";
import { fmt } from "../utils";
import { pluralKey } from "./index";

type Ctx = { locale: Locale; t: Messages };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

/** Looks up `${base}_one` / `${base}_other` in a message section and interpolates {count}. */
export function usePlural() {
  const { locale } = useI18n();
  return (section: Record<string, string>, base: string, count: number, vars: Record<string, string | number> = {}) =>
    fmt(section[`${base}_${pluralKey(locale, count)}`] ?? "", { count, ...vars });
}
