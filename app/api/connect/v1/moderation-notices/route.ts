import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);
    const notices = await prisma.moderationNotice.findMany({
      where: { recipientId: userId, isRead: false },
      orderBy: { createdAt: "asc" },
      include: {
        targetPost: { select: { id: true, content: true, moderationStatus: true } },
      },
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error("Failed to fetch moderation notices:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderation notices" },
      { status: 500 },
    );
  }
}
