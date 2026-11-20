/** Wordmark of the residents' portal: a double arch next to "Le Portail / des résidents". */
export function PortalLogo({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3" aria-label={label} role="img">
      <svg
        viewBox="0 0 48 56"
        className={compact ? "h-11 w-auto" : "h-14 w-auto"}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="5"
        aria-hidden="true"
      >
        <path d="M4 56V26a20 20 0 0 1 40 0v30" />
        <path d="M17 56V30a7 7 0 0 1 14 0v26" />
      </svg>
      <span className="flex flex-col whitespace-nowrap font-display uppercase leading-none" aria-hidden="true">
        <span className={compact ? "text-[28px] font-light text-brand" : "text-[34px] font-light tracking-wide text-brand"}>
          Le Portail
        </span>
        <span className={compact ? "mt-0.5 text-[12.5px] tracking-[0.28em] text-ink" : "mt-1 text-[15px] tracking-[0.26em] text-ink"}>
          Des résidents
        </span>
      </span>
    </span>
  );
}
