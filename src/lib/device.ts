import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const DEVICE_COOKIE = "ciup-device";
const UUID_RE = /^[0-9a-f-]{36}$/;

/** Reads the anonymous device id (for rendering). Returns null if the visitor has none yet. */
export async function getDeviceId(): Promise<string | null> {
  const v = (await cookies()).get(DEVICE_COOKIE)?.value;
  return v && UUID_RE.test(v) ? v : null;
}

/** Reads or creates the device id. Only call from server actions / route handlers. */
export async function ensureDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) return existing;
  const id = randomUUID();
  (await cookies()).set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}
