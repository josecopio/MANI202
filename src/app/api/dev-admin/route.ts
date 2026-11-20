import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Development shortcut: visit /api/dev-admin to be signed in as a local admin without the
 * magic-link flow. Only exists when NODE_ENV === "development"; 404 everywhere else.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }
  const email = "dev-admin@localhost.test";
  const user = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, name: "Dev Admin", role: "ADMIN", emailVerified: new Date() },
  });
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sessionToken = randomUUID();
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const res = NextResponse.redirect(new URL("/admin", request.url));
  res.cookies.set("authjs.session-token", sessionToken, { httpOnly: true, sameSite: "lax", path: "/", expires });
  return res;
}
