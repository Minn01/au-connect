import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await ctx.params;
    const authUserId = getAuthUserIdFromReq(req);

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userAId: true, userBId: true },
    });

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conv.userAId !== authUserId && conv.userBId !== authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all messages
    await prisma.message.deleteMany({
      where: { conversationId },
    });

    // Reset conversation metadata
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: null,
        userALastReadAt: null,
        userBLastReadAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
