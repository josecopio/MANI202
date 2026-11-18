"use client";

import { DoorClosed, Globe, Lock, TriangleAlert, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "@/lib/utils";
import type { Audience, SpaceImpact } from "@/lib/types";

export type AccessEvent = {
  audience: Audience;
  houseName: string | null;
  eligible: boolean;
  spaceImpact: SpaceImpact;
};

/**
 * What a resident needs to know before going: who may attend, and what the event does to the
 * space. `compact` only shows the things that are restrictions (used in lists and chips).
 */
export function AccessBadges({ event, compact = false }: { event: AccessEvent; compact?: boolean }) {
  const { t } = useI18n();
  const r = t.restrictions;
  return (
    <>
      {event.audience === "HOUSE_ONLY" &&
        (event.eligible ? (
          <span className="badge bg-accent-soft text-accent">
            <Lock size={13} aria-hidden="true" />
            {r.yourHouseOnly}
          </span>
        ) : (
          <span className="badge bg-danger-soft text-danger">
            <Lock size={13} aria-hidden="true" />
            {fmt(r.audienceHouse, { house: event.houseName ?? "" })}
          </span>
        ))}
      {!compact && event.audience === "RESIDENTS_ONLY" && (
        <span className="badge bg-neutral-soft text-ink">
          <Users size={13} aria-hidden="true" />
          {r.audienceResidents}
        </span>
      )}
      {!compact && event.audience === "PUBLIC" && (
        <span className="badge bg-neutral-soft text-ink">
          <Globe size={13} aria-hidden="true" />
          {r.audiencePublic}
        </span>
      )}
      {event.spaceImpact === "CLOSED" && (
        <span className="badge bg-warn-soft text-warn">
          <DoorClosed size={13} aria-hidden="true" />
          {r.impactClosed}
        </span>
      )}
      {event.spaceImpact === "LIMITED" && (
        <span className="badge bg-warn-soft text-warn">
          <TriangleAlert size={13} aria-hidden="true" />
          {r.impactLimited}
        </span>
      )}
    </>
  );
}

/** The restriction note and the "can I come?" line, for expanded cards and the event page. */
export function AccessDetails({ event, note }: { event: AccessEvent; note: string | null }) {
  const { t } = useI18n();
  const r = t.restrictions;
  const restricted = event.audience === "HOUSE_ONLY" || event.spaceImpact !== "NONE";
  return (
    <div className="rounded-control border border-line bg-bg p-3" role="group" aria-label={r.heading}>
      <p className="text-sm font-semibold">{r.heading}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <AccessBadges event={event} />
      </div>
      {event.audience === "HOUSE_ONLY" && (
        <p className={`mt-2 text-sm font-medium ${event.eligible ? "text-accent" : "text-danger"}`}>
          {event.eligible ? r.forYou : r.notForYou}
        </p>
      )}
      {note && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">{r.noteLabel} : </span>
          {note}
        </p>
      )}
      {!restricted && !note && <p className="mt-2 text-sm text-muted">{r.noRestrictions}</p>}
    </div>
  );
}
