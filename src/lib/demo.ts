/**
 * Demo mode, for test deployments (e.g. user tests on a free Render instance, where outbound
 * SMTP is blocked). No email is sent: the sign-in link is shown on screen instead, so anyone
 * can sign in with any address. Never enable it on a real deployment.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** Short-lived cookie carrying the last sign-in link to the "check your inbox" page. */
export const DEMO_LINK_COOKIE = "ciup-demo-link";

/** Only ever display a link that points at our own Auth.js email callback. */
export function isSignInLink(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return (u.protocol === "https:" || u.protocol === "http:") && u.pathname === "/api/auth/callback/email";
  } catch {
    return false;
  }
}
