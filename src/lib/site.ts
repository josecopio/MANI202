export function getBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.AUTH_URL ||
    process.env.RENDER_EXTERNAL_URL || // set by Render on web services
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export function getSiteDomain(): string {
  try {
    return new URL(getBaseUrl()).host;
  } catch {
    return "events.ciup.local";
  }
}

export function eventUrl(id: string): string {
  return `${getBaseUrl()}/events/${id}`;
}
