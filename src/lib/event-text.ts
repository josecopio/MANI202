import type { Locale } from "./types";

type Texts = {
  title: string;
  description: string;
  restrictionNote: string | null;
  accessPass: string | null;
  titleEn?: string | null;
  descriptionEn?: string | null;
  restrictionNoteEn?: string | null;
  accessPassEn?: string | null;
};

/** The event's texts in the viewer's language (English falls back to French when not provided). */
export function eventTexts(e: Texts, locale: Locale) {
  const en = locale === "en";
  return {
    title: (en && e.titleEn) || e.title,
    description: (en && e.descriptionEn) || e.description,
    restrictionNote: (en && e.restrictionNoteEn) || e.restrictionNote,
    accessPass: (en && e.accessPassEn) || e.accessPass,
  };
}
