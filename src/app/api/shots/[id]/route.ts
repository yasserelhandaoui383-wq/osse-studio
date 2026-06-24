import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const UpdateShot = z.object({
  prompt: z.string().optional(),
  cameraMotion: z.string().optional(),
  durationSeconds: z.number().positive().optional(),
  imagePath: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const parsed = UpdateShot.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const shot = await prisma.shot.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(shot);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    await prisma.shot.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
