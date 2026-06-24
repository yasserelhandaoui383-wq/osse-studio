import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { shots: true } } },
    });
    return NextResponse.json(projects);
  });
}

const CreateProject = z.object({
  title: z.string().min(1, "Title is required."),
  aspectRatio: z.enum(["9:16", "16:9"]).default("9:16"),
  colorArcNotes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = CreateProject.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    const project = await prisma.project.create({ data: parsed.data });
    return NextResponse.json(project, { status: 201 });
  });
}
