import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const CreateShot = z.object({
  projectId: z.string().min(1),
  prompt: z.string().default(""),
  cameraMotion: z.string().default("static"),
  durationSeconds: z.number().positive().default(3),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = CreateShot.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const last = await prisma.shot.findFirst({
      where: { projectId: parsed.data.projectId },
      orderBy: { order: "desc" },
    });
    const shot = await prisma.shot.create({
      data: { ...parsed.data, order: (last?.order ?? -1) + 1 },
    });
    return NextResponse.json(shot, { status: 201 });
  });
}

// Reorder shots: body { order: string[] of shot ids }
const Reorder = z.object({ order: z.array(z.string()).min(1) });

export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const parsed = Reorder.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    await prisma.$transaction(
      parsed.data.order.map((id, idx) =>
        prisma.shot.update({ where: { id }, data: { order: idx } })
      )
    );
    return NextResponse.json({ ok: true });
  });
}
