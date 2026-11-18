export type EventColor = { color: string; bg: string };

/** Light tint of a colour, for chip backgrounds. */
export function tint(color: string): string {
  return `color-mix(in srgb, ${color} 12%, white)`;
}
