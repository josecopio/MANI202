import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "./db";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;
export type ImageExt = keyof typeof TYPES;

export function uploadDir(): string {
  // Runtime-configurable on purpose: tell the bundler not to trace the whole project for it.
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");
}

/** Detects the real image type from magic bytes (never trust the client's MIME type). */
export function detectImageType(buf: Buffer): ImageExt | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export function mimeForExt(ext: string): string | null {
  return (TYPES as Record<string, string>)[ext] ?? null;
}

/**
 * Where uploads go: Vercel Blob when a token is set, otherwise UPLOAD_STORAGE=database
 * (hosts without a persistent disk, e.g. Render free) or the local disk (default).
 */
export function storageDriver(): "blob" | "database" | "disk" {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return process.env.UPLOAD_STORAGE === "database" ? "database" : "disk";
}

/** Stores an image and returns the public URL to save in Event.imageUrl. */
export async function saveImage(buf: Buffer, ext: ImageExt): Promise<string> {
  const name = `${randomUUID()}.${ext}`;

  if (storageDriver() === "database") {
    await db.upload.create({ data: { id: name, mime: TYPES[ext], data: new Uint8Array(buf), size: buf.length } });
    return `/uploads/${name}`;
  }

  if (storageDriver() === "blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(`events/${name}`, buf, {
      access: "public",
      contentType: TYPES[ext],
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, name), buf);
  return `/uploads/${name}`;
}

export const UPLOAD_NAME_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

export async function readUpload(name: string): Promise<{ data: Buffer; mime: string } | null> {
  if (!UPLOAD_NAME_RE.test(name)) return null;
  const ext = name.split(".").pop()!;
  // Database first (UPLOAD_STORAGE=database), then the local disk.
  const row = await db.upload.findUnique({ where: { id: name } }).catch(() => null);
  if (row) return { data: Buffer.from(row.data), mime: row.mime };
  try {
    return { data: await readFile(path.join(/*turbopackIgnore: true*/ uploadDir(), name)), mime: TYPES[ext as ImageExt] };
  } catch {
    return null;
  }
}
