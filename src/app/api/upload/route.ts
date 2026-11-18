import { NextResponse } from "next/server";
import { assertUser, ForbiddenError } from "@/lib/permissions";
import { detectImageType, MAX_IMAGE_BYTES, saveImage } from "@/lib/storage";

export const runtime = "nodejs";

/** Image upload for the event form. Signed-in users only; type is sniffed from the bytes. */
export async function POST(request: Request) {
  try {
    await assertUser();
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    throw error;
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = detectImageType(buffer);
  if (!ext) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });

  const url = await saveImage(buffer, ext);
  return NextResponse.json({ url });
}
