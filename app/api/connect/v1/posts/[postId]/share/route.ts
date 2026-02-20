import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { createNotification } from "@/lib/server/notifications.server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { postId } = await context.params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is missing from params" },
        { status: 400 },
      );
    }

    let sharedByUserId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.sharedByUserId === "string") {
        sharedByUserId = body.sharedByUserId;
      }
    } catch {
      // Allow empty body for backward compatibility.
    }

    const result = await prisma.$transaction(async (tx) => {
      let actorUserId = userId;

      if (sharedByUserId && sharedByUserId !== userId) {
        const sharer = await tx.user.findUnique({
          where: { id: sharedByUserId },
          select: { id: true },
        });

        if (sharer?.id) {
          actorUserId = sharer.id;
        }
      }

      const post = await tx.post.update({
        where: { id: postId },
        data: {
          shareCount: { increment: 1 },
        },
        select: {
          userId: true,
          shareCount: true,
        },
      });

      //  Create notification (if not sharing own post)
      if (post.userId !== actorUserId) {
        await createNotification({
          userId: post.userId,   // post owner
          fromUserId: actorUserId, // shared-link owner
          type: "POST_SHARED",
          entityId: postId,
        });
      }

      return { success: true, shareCount: post.shareCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error tracking share:", error);
    return NextResponse.json(
      { error: "Failed to track share" },
      { status: 500 },
    );
  }
}
