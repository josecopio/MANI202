/** Official logo of the Cité internationale universitaire de Paris (copied from ciup.fr). */
export function Logo({ label, variant = "dark", className }: { label: string; variant?: "dark" | "white"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "white" ? "/brand/ciup-logo-white.svg" : "/brand/ciup-logo.svg"}
      alt={label}
      width={154}
      height={53}
      className={className ?? "h-10 w-auto shrink-0 sm:h-11"}
    />
  );
}
