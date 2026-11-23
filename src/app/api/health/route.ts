import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Health check for the host (Render healthCheckPath): the app answers and the database responds. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
