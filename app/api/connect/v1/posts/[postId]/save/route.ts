import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { NextRequest, NextResponse } from "next/server";
import { PostInteractionType } from "@/lib/generated/prisma";

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

    let actorType: "USER" | "COMMUNITY" = "USER";
    try {
      const body = await req.json();
      if (body?.actorType === "COMMUNITY") actorType = "COMMUNITY";
    } catch {
      // Allow empty body for existing save callers.
    }

    if (actorType === "COMMUNITY") {
      return NextResponse.json(
        { error: "Community pages cannot save posts" },
        { status: 403 },
      );
    }

    const { postId } = await context.params;

    const visiblePost = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { id: true },
    });
    if (!visiblePost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await prisma.postInteraction.findFirst({
      where: {
        actorType: "USER",
        userId,
        postId,
        type: PostInteractionType.SAVED,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.postInteraction.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { savedCount: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({ saved: false });
    }

    await prisma.$transaction([
      prisma.postInteraction.create({
        data: {
          userId,
          postId,
          type: PostInteractionType.SAVED,
          actorType: "USER",
          communityId: null,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { savedCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to toggle save" },
      { status: 500 },
    );
  }
}