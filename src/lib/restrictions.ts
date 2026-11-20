import type { Messages } from "./i18n";
import { fmt } from "./utils";
import type { Audience, SpaceImpact } from "./types";

export type AccessInfo = {
  audience: Audience;
  houseName: string | null;
  spaceImpact: SpaceImpact;
  restrictionNote: string | null;
  accessPass?: string | null;
};

/** True when the event comes with something a resident should know about (reserved or space affected). */
export function hasRestrictions(e: Pick<AccessInfo, "audience" | "spaceImpact">): boolean {
  return e.audience === "HOUSE_ONLY" || e.spaceImpact !== "NONE";
}

export function audienceLabel(m: Messages, e: Pick<AccessInfo, "audience" | "houseName">): string {
  if (e.audience === "PUBLIC") return m.restrictions.audiencePublic;
  if (e.audience === "HOUSE_ONLY") return fmt(m.restrictions.audienceHouse, { house: e.houseName ?? "" });
  return m.restrictions.audienceResidents;
}

export function impactLabel(m: Messages, impact: SpaceImpact): string | null {
  if (impact === "CLOSED") return m.restrictions.impactClosed;
  if (impact === "LIMITED") return m.restrictions.impactLimited;
  return null;
}

/** Plain-text lines for calendar apps and e-mails. */
export function restrictionLines(m: Messages, e: AccessInfo): string[] {
  const lines: string[] = [];
  const impact = impactLabel(m, e.spaceImpact);
  if (impact) lines.push(`${m.restrictions.spaceLabel}${m.punct.colon}${impact}`);
  if (e.restrictionNote) lines.push(e.restrictionNote);
  if (e.accessPass) lines.push(`${m.access.passRequired}${m.punct.colon}${e.accessPass}`);
  return lines;
}
