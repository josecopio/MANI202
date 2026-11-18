import { en } from "./en";
import { fr, type Messages } from "./fr";
import type { Locale } from "../types";

export type { Messages };
export const messagesByLocale: Record<Locale, Messages> = { fr, en };

export function getMessagesFor(locale: Locale): Messages {
  return messagesByLocale[locale];
}

/** Picks `${key}_one` / `${key}_other` according to the locale's plural rules. */
export function pluralKey(locale: Locale, count: number): "one" | "other" {
  return new Intl.PluralRules(locale === "fr" ? "fr-FR" : "en-GB").select(count) === "one"
    ? "one"
    : "other";
}
