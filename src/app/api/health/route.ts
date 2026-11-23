import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check for the host (Render healthCheckPath): the app answers and the database responds.
 * `commit` is the deployed Git commit (set by Render), to tell which version is live.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
