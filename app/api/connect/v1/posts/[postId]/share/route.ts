import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { getManagedCommunity } from "@/lib/communityAuth";
import { createNotification } from "@/lib/server/notifications.server";
import { requireAccountVerification } from "@/lib/accountVerification";

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

    const verificationError = await requireAccountVerification(userId);
    if (verificationError) return verificationError;

    const { postId } = await context.params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is missing from params" },
        { status: 400 },
      );
    }

    const visiblePost = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: {
        id: true,
        userId: true,
        actorType: true,
        communityId: true,
        shareCount: true,
      },
    });
    if (!visiblePost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let sharedByCommunityId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.sharedByCommunityId === "string") {
        sharedByCommunityId = body.sharedByCommunityId;
      }
    } catch {
      // Allow empty body for backward compatibility.
    }

    const actorUserId = userId;
    const actorType = sharedByCommunityId ? "COMMUNITY" : "USER";

    const actorUser = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true },
    });

    if (!actorUser) {
      return NextResponse.json({ error: "Share actor not found" }, { status: 404 });
    }

    const community =
      actorType === "COMMUNITY"
        ? await getManagedCommunity(actorUserId, sharedByCommunityId!)
        : null;

    if (actorType === "COMMUNITY" && !community) {
      return NextResponse.json(
        { error: "Unauthorized to share as this community" },
        { status: 403 },
      );
    }

    const existingShare = await prisma.postInteraction.findFirst({
      where:
        actorType === "COMMUNITY"
          ? {
              actorType: "COMMUNITY",
              communityId: community!.id,
              postId,
              type: "SHARE",
            }
          : {
              actorType: "USER",
              userId: actorUserId,
              postId,
              type: "SHARE",
            },
      select: { id: true },
    });

    if (existingShare) {
      return NextResponse.json({ success: true, shareCount: visiblePost.shareCount });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.postInteraction.create({
        data: {
          userId: actorUserId,
          postId,
          type: "SHARE",
          actorType,
          communityId: community?.id ?? null,
        },
      });

      const post = await tx.post.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
        select: {
          userId: true,
          actorType: true,
          communityId: true,
          shareCount: true,
        },
      });

      const recipientActorType =
        post.actorType === "COMMUNITY" && post.communityId
          ? "COMMUNITY"
          : "USER";
      const isSameActor =
        recipientActorType === "COMMUNITY"
          ? actorType === "COMMUNITY" && post.communityId === community?.id
          : actorType === "USER" && post.userId === actorUserId;

      if (!isSameActor) {
        await createNotification({
          userId: post.userId,
          fromUserId: actorUserId,
          recipientActorType,
          recipientCommunityId:
            recipientActorType === "COMMUNITY" ? post.communityId : null,
          fromActorType: actorType,
          fromCommunityId: community?.id ?? null,
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
