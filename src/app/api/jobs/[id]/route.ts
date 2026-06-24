import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handle, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Polls a shot's generation status. Used by the UI to update status badges.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return handle(async () => {
    const shot = await prisma.shot.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, imagePath: true, videoPath: true, errorMessage: true },
    });
    if (!shot) throw new AppError("Shot not found.", 404);
    return NextResponse.json(shot);
  });
}
