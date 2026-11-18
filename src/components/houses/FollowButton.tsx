"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Home, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { setHomeAction, toggleHouseAction } from "@/actions/prefs";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  following: boolean;
  isHome: boolean;
  /** Shared sites (library, park…) cannot be someone's home. */
  canBeHome: boolean;
  size?: "sm" | "md";
};

/** Follow / unfollow a house, and mark it as "my house". */
export function FollowButton({ slug, following, isHome, canBeHome, size = "sm" }: Props) {
  const { t } = useI18n();
  const [state, setState] = useOptimistic({ following: following || isHome, isHome }, (_s, next: { following: boolean; isHome: boolean }) => next);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const sm = size === "sm" ? "btn-sm" : "";

  const toggleFollow = () =>
    startTransition(async () => {
      setFailed(false);
      setState({ following: !state.following, isHome: state.following ? false : state.isHome });
      const r = await toggleHouseAction(slug);
      if (!r.ok) setFailed(true);
    });

  const toggleHome = () =>
    startTransition(async () => {
      setFailed(false);
      setState({ following: !state.isHome || state.following, isHome: !state.isHome });
      const r = await setHomeAction(state.isHome ? null : slug);
      if (!r.ok) setFailed(true);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleFollow}
        aria-pressed={state.following}
        className={cn("btn", sm, state.following ? "btn-secondary" : "btn-primary")}
      >
        {state.following ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {state.following ? t.houses.following : t.houses.follow}
      </button>
      {canBeHome && (
        <button type="button" onClick={toggleHome} aria-pressed={state.isHome} className={cn("btn btn-ghost", sm)}>
          <Home size={16} aria-hidden="true" />
          {state.isHome ? t.houses.removeHome : t.houses.makeHome}
        </button>
      )}
      {failed && (
        <span role="alert" className="text-sm font-medium text-danger">
          {t.houses.error}
        </span>
      )}
    </div>
  );
}
