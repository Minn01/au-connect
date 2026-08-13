import { getHeaderUserInfo } from "@/lib/authFunctions";
import { getManagedCommunity } from "@/lib/communityAuth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/server/notifications.server";
import { requireAccountVerification } from "@/lib/accountVerification";

// like or unlike a post
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

    let actorType: "USER" | "COMMUNITY" = "USER";
    let communityId: string | null = null;

    try {
      const body = await req.json();
      if (body?.actorType === "COMMUNITY") {
        actorType = "COMMUNITY";
        communityId = typeof body?.communityId === "string" ? body.communityId : null;
      }
    } catch {
      // Allow empty body for existing user-like callers.
    }

    const visiblePost = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { id: true, userId: true, actorType: true, communityId: true },
    });
    if (!visiblePost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const community =
      actorType === "COMMUNITY" && communityId
        ? await getManagedCommunity(userId, communityId)
        : null;

    if (actorType === "COMMUNITY" && !community) {
      return NextResponse.json(
        { error: "Unauthorized to like as this community" },
        { status: 403 },
      );
    }

    const interactionWhere =
      actorType === "COMMUNITY"
        ? { actorType: "COMMUNITY" as const, communityId: community!.id, postId, type: "LIKE" as const }
        : { actorType: "USER" as const, userId, postId, type: "LIKE" as const };

    const existingLike = await prisma.postInteraction.findFirst({
      where: interactionWhere,
      select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      if (existingLike) {
        await tx.postInteraction.delete({ where: { id: existingLike.id } });

        const post = await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });

        return { isLiked: false, likeCount: post.likeCount };
      }

      await tx.postInteraction.create({
        data: {
          userId,
          postId,
          type: "LIKE",
          actorType,
          communityId: community?.id ?? null,
        },
      });

      const post = await tx.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: {
          userId: true,
          actorType: true,
          communityId: true,
          likeCount: true,
        },
      });

      const recipientActorType =
        post.actorType === "COMMUNITY" && post.communityId
          ? "COMMUNITY"
          : "USER";
      const isSameActor =
        recipientActorType === "COMMUNITY"
          ? actorType === "COMMUNITY" && post.communityId === community?.id
          : actorType === "USER" && post.userId === userId;

      if (!isSameActor) {
        await createNotification({
          userId: post.userId,
          fromUserId: userId,
          recipientActorType,
          recipientCommunityId:
            recipientActorType === "COMMUNITY" ? post.communityId : null,
          fromActorType: actorType,
          fromCommunityId: community?.id ?? null,
          type: "POST_LIKED",
          entityId: postId,
        });
      }

      return { isLiked: true, likeCount: post.likeCount };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Toggle like failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
