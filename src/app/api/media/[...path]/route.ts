import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { mediaRoot } from "@/lib/env";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".gif": "image/gif",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4",
};

// Serves files from MEDIA_DIR. Path traversal is blocked.
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const rel = (params.path || []).join("/");
  const root = mediaRoot();
  const abs = path.normalize(path.join(root, rel));
  if (!abs.startsWith(path.normalize(root))) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const data = fs.readFileSync(abs);
  const type = MIME[path.extname(abs).toLowerCase()] || "application/octet-stream";
  return new NextResponse(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600" } });
}
