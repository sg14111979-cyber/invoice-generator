import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { HttpError } from "@/lib/api";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Validates and stores a brand logo. The filename is generated rather than taken
 * from the upload, so a hostile name can never escape the upload directory.
 */
export async function saveLogo(file: File): Promise<string> {
  const extension = ALLOWED[file.type];
  if (!extension) {
    throw new HttpError(415, "Logo must be a PNG, JPG, WEBP or SVG image.");
  }
  if (file.size === 0) throw new HttpError(400, "The uploaded file is empty.");
  if (file.size > MAX_BYTES) {
    throw new HttpError(413, "Logo must be 2 MB or smaller.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // SVG can carry scripts, so only accept ones without active content.
  if (extension === "svg") {
    const text = buffer.toString("utf8").toLowerCase();
    if (text.includes("<script") || text.includes("onload=") || text.includes("javascript:")) {
      throw new HttpError(400, "SVG logos must not contain scripts.");
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  await writeFile(path.join(UPLOAD_DIR, name), buffer);
  return `/uploads/${name}`;
}

/** Best-effort removal of a previously stored logo. */
export async function deleteLogo(logoPath: string | null | undefined): Promise<void> {
  if (!logoPath || !logoPath.startsWith("/uploads/")) return;
  const name = path.basename(logoPath);
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => undefined);
}
