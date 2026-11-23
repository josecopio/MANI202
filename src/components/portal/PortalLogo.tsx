/** Wordmark of the residents' portal: a double arch next to "Le Portail / des résidents". */
export function PortalLogo({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    // Compact (phone header): the wordmark shrinks under 380 px and only the arches remain under
    // 340 px, so the header's 44 px icons still fit on 320-360 px screens.
    <span className={compact ? "inline-flex items-center gap-3 max-[379px]:gap-2" : "inline-flex items-center gap-3"} aria-label={label} role="img">
      <svg
        viewBox="0 0 48 56"
        className={compact ? "h-11 w-auto max-[379px]:h-9" : "h-14 w-auto"}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="5"
        aria-hidden="true"
      >
        <path d="M4 56V26a20 20 0 0 1 40 0v30" />
        <path d="M17 56V30a7 7 0 0 1 14 0v26" />
      </svg>
      <span
        className={compact ? "flex flex-col whitespace-nowrap font-display uppercase leading-none max-[339px]:hidden" : "flex flex-col whitespace-nowrap font-display uppercase leading-none"}
        aria-hidden="true"
      >
        <span className={compact ? "text-[28px] font-light text-brand max-[379px]:text-[22px]" : "text-[34px] font-light tracking-wide text-brand"}>
          Le Portail
        </span>
        <span className={compact ? "mt-0.5 text-[12.5px] tracking-[0.28em] text-ink max-[379px]:text-[10px] max-[379px]:tracking-[0.2em]" : "mt-1 text-[15px] tracking-[0.26em] text-ink"}>
          Des résidents
        </span>
      </span>
    </span>
  );
}
