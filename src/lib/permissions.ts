import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "./types";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organisation: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? null, role: u.role, organisation: u.organisation };
});

/** For pages: redirects anonymous visitors to the sign-in page. */
export async function requireUser(callbackUrl = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** For pages: only admins get through. */
export async function requireAdmin(callbackUrl = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(callbackUrl);
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("unauthenticated");
  return user;
}

export async function assertAdmin(): Promise<CurrentUser> {
  const user = await assertUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("admin only");
  return user;
}

export function canManageEvent(user: CurrentUser, event: { createdById: string }): boolean {
  return user.role === "ADMIN" || event.createdById === user.id;
}
