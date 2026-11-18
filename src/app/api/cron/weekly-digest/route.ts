import { timingSafeEqual } from "node:crypto";
import { sendWeeklyDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse to run unauthenticated
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Triggered weekly by Vercel Cron (see vercel.json) or any scheduler sending the bearer secret. */
export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  const result = await sendWeeklyDigest();
  return Response.json(result);
}
