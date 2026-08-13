import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = getAuthUserIdFromReq(req);
    const { id } = await params;

    const result = await prisma.moderationNotice.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Moderation notice not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark moderation notice as read:", error);
    return NextResponse.json(
      { error: "Failed to update moderation notice" },
      { status: 500 },
    );
  }
}
