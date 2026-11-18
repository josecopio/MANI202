/** Placeholder mark. Replace with the official CIUP logo asset before going live. */
export function Logo({ label }: { label: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" role="img" aria-label={label} className="shrink-0">
      <rect width="44" height="44" rx="10" fill="#1F5D4C" />
      <path d="M8 31V20a14 14 0 0 1 28 0v11" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
      <text
        x="22"
        y="27"
        textAnchor="middle"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontWeight="700"
        fontSize="13"
        letterSpacing=".5"
        fill="#fff"
      >
        CIUP
      </text>
    </svg>
  );
}
