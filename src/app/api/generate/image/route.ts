import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";
import { enqueueShotJob } from "@/lib/queue";
import { generateImage } from "@/lib/generation";

export const dynamic = "force-dynamic";

const Body = z.object({ shotId: z.string().min(1) });

export async function POST(req: NextRequest) {
  return handle(async () => {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);

    const shot = await prisma.shot.findUnique({ where: { id: parsed.data.shotId } });
    if (!shot) throw new AppError("Shot not found.", 404);

    await prisma.shot.update({ where: { id: shot.id }, data: { status: "queued" } });
    enqueueShotJob(shot.id, () => generateImage(shot.id).then(() => undefined));

    return NextResponse.json({ ok: true, shotId: shot.id, status: "queued" }, { status: 202 });
  });
}
