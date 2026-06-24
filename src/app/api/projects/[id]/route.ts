import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { shots: { orderBy: { order: "asc" } } },
    });
    if (!project) throw new AppError("Project not found.", 404);
    return NextResponse.json(project);
  });
}

const UpdateProject = z.object({
  title: z.string().min(1).optional(),
  aspectRatio: z.enum(["9:16", "16:9"]).optional(),
  colorArcNotes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const parsed = UpdateProject.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const project = await prisma.project.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(project);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  });
}
