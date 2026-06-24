import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";
import { mediaRoot } from "@/lib/env";
import { enqueueRenderJob } from "@/lib/queue";
import { exportTimeline } from "@/lib/ffmpeg";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string().min(1),
  audioPath: z.string().optional(), // media-relative path to an audio file
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
      include: { shots: { orderBy: { order: "asc" } } },
    });
    if (!project) throw new AppError("Project not found.", 404);

    const clips = project.shots
      .filter((s) => s.videoPath)
      .map((s) => ({
        videoAbsPath: path.join(mediaRoot(), s.videoPath as string),
        durationSeconds: s.durationSeconds,
      }));
    if (clips.length === 0) throw new AppError("No shots have a generated video yet.", 400);

    const job = await prisma.renderJob.create({ data: { projectId: project.id, status: "queued" } });
    const outRel = path.posix.join("exports", `${project.id}_${Date.now()}.mp4`);
    const audioAbs = parsed.data.audioPath ? path.join(mediaRoot(), parsed.data.audioPath) : null;

    enqueueRenderJob(job.id, (onProgress) =>
      exportTimeline({
        clips,
        aspectRatio: project.aspectRatio,
        audioAbsPath: audioAbs,
        outRelPath: outRel,
        onProgress,
      })
    );

    return NextResponse.json({ ok: true, jobId: job.id, status: "queued" }, { status: 202 });
  });
}

// Poll render job status: /api/export?jobId=...
export async function GET(req: NextRequest) {
  return handle(async () => {
    const jobId = req.nextUrl.searchParams.get("jobId");
    if (!jobId) throw new AppError("jobId query param is required.", 400);
    const job = await prisma.renderJob.findUnique({ where: { id: jobId } });
    if (!job) throw new AppError("Render job not found.", 404);
    return NextResponse.json(job);
  });
}
