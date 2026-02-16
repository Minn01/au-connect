import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await ctx.params;
    const authUserId = getAuthUserIdFromReq(req);

    if (!conversationId || !messageId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1️⃣ Validate conversation ownership
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

    // 2️⃣ Validate message exists
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true },
    });

    if (!msg || msg.conversationId !== conversationId) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // 3️⃣ Only sender can delete
    if (msg.senderId !== authUserId) {
      return NextResponse.json({ error: "Only sender can delete this message" }, { status: 403 });
    }

    // 4️⃣ Delete message
    await prisma.message.delete({
      where: { id: messageId },
    });

    // 5️⃣ Recalculate lastMessageAt
    const latest = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: latest?.createdAt ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}