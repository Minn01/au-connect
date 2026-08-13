import { NextRequest, NextResponse } from "next/server";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { REPLIES_PER_FETCH, TOP_LEVEL_COMMENTS_FETCH_LIMIT } from "./constants";
import { CreateCommentSchema } from "@/zod/CommentSchema";
import { createNotification } from "@/lib/server/notifications.server";
import { requireAccountVerification } from "@/lib/accountVerification";
import { getManagedCommunity } from "@/lib/communityAuth";


// function to create comments/replies
const MAX_COMMENT_DEPTH = 2; // 0,1,2 = 3 layers total

function withCommentActorIdentity<
  T extends {
    actorType?: "USER" | "COMMUNITY";
    username: string;
    profilePic: string;
    community?: {
      name: string;
      profilePic?: string | null;
    } | null;
  },
>(comment: T): T {
  if (comment.actorType !== "COMMUNITY") return comment;

  return {
    ...comment,
    username: comment.community?.name ?? comment.username,
    profilePic: comment.community?.profilePic || "/default_profile.jpg",
  };
}

export async function createComments(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const verificationError = await requireAccountVerification(userId);
    if (verificationError) return verificationError;

    const { postId } = params;

    const body = await req.json();
    const parsed = CreateCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed" },
        { status: 400 },
      );
    }

    const { content, parentCommentId, actorType, communityId } = parsed.data;

    const visiblePost = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { id: true },
    });

    if (!visiblePost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, profilePic: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // 🔥 DEPTH CHECK
    let depth = 0;
    let currentParentId = parentCommentId;

    while (currentParentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      if (!parent) break;

      depth++;
      currentParentId = parent.parentId || "";

      if (depth > MAX_COMMENT_DEPTH) {
        return NextResponse.json(
          { error: "Max reply depth reached" },
          { status: 400 },
        );
      }
    }

    const activeActorType = actorType === "COMMUNITY" ? "COMMUNITY" : "USER";
    const community =
      activeActorType === "COMMUNITY" && communityId
        ? await getManagedCommunity(userId, communityId)
        : null;

    if (activeActorType === "COMMUNITY" && !community) {
      return NextResponse.json(
        { error: "Unauthorized to comment as this community" },
        { status: 403 },
      );
    }

    const displayName = community?.name ?? user.username;
    const displayProfilePic = community
      ? community.profilePic && community.profilePic.trim() !== ""
        ? community.profilePic
        : "/default_profile.jpg"
      : user.profilePic || "/default_profile.jpg";

    const comment = await prisma.comment.create({
      data: {
        postId,
        parentId: parentCommentId ?? null,
        content: content.trim(),

        userId: user.id,
        username: displayName,
        profilePic: displayProfilePic,
        actorType: activeActorType,
        communityId: community?.id ?? null,
      },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
          },
        },
      },
    });

    await prisma.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
      },
    });


    // ===============================
    // 🔔 Notification Logic
    // ===============================

    // If this is a reply
    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { userId: true, actorType: true, communityId: true },
      });

      if (parentComment) {
        const recipientActorType =
          parentComment.actorType === "COMMUNITY" && parentComment.communityId
            ? "COMMUNITY"
            : "USER";
        const isSameActor =
          recipientActorType === "COMMUNITY"
            ? activeActorType === "COMMUNITY" &&
              parentComment.communityId === community?.id
            : activeActorType === "USER" && parentComment.userId === user.id;

        if (!isSameActor) {
        await createNotification({
          userId: parentComment.userId, // original comment owner
          fromUserId: user.id,          // who replied
          recipientActorType,
          recipientCommunityId:
            recipientActorType === "COMMUNITY"
              ? parentComment.communityId
              : null,
          fromActorType: activeActorType,
          fromCommunityId: community?.id ?? null,
          type: "COMMENT_REPLIED",
          entityId: postId,
        });
        }
      }
    } else {
      // This is a normal comment on post
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true, actorType: true, communityId: true },
      });

      if (post) {
        const recipientActorType =
          post.actorType === "COMMUNITY" && post.communityId
            ? "COMMUNITY"
            : "USER";
        const isSameActor =
          recipientActorType === "COMMUNITY"
            ? activeActorType === "COMMUNITY" && post.communityId === community?.id
            : activeActorType === "USER" && post.userId === user.id;

        if (!isSameActor) {
        await createNotification({
          userId: post.userId,          // post owner
          fromUserId: user.id,          // who commented
          recipientActorType,
          recipientCommunityId:
            recipientActorType === "COMMUNITY" ? post.communityId : null,
          fromActorType: activeActorType,
          fromCommunityId: community?.id ?? null,
          type: "POST_COMMENTED",
          entityId: postId,
        });
        }
      }
    }

    return NextResponse.json({
      ...withCommentActorIdentity(comment),
      replyCount: 0,
    });


  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getCommentsForPost(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const { postId } = params;
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor"); // last comment id for pagination

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { commentsDisabled: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.commentsDisabled) {
      return NextResponse.json(
        { error: "comments for this posts are disabled" },
        { status: 400 },
      );
    }

    // Fetch top-level comments only (parentId = null)
    const topComments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: "desc" },
      take: TOP_LEVEL_COMMENTS_FETCH_LIMIT,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
          },
        },
        replies: {
          take: REPLIES_PER_FETCH,
          orderBy: { createdAt: "asc" },
          include: {
            community: {
              select: {
                id: true,
                name: true,
                slug: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });

    // Return comments along with reply count
    const commentsWithReplyCount = await Promise.all(
      topComments.map(async (comment) => {
        const totalReplies = await prisma.comment.count({
          where: { parentId: comment.id },
        });

        return {
          ...withCommentActorIdentity(comment),
          replies: comment.replies.map(withCommentActorIdentity),
          replyCount: totalReplies,
        };
      }),
    );

    return NextResponse.json({
      comments: commentsWithReplyCount,
      nextCursor: commentsWithReplyCount.length
        ? commentsWithReplyCount[commentsWithReplyCount.length - 1].id
        : null,
    });
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Fixed getRepliesForComment in your comments API file.
// The key fix: fetch REPLIES_PER_FETCH + 1 items, if we get that many
// there are more pages. Return only REPLIES_PER_FETCH and set cursor.
// If we get fewer, nextCursor is null → hasNextPage = false.

export async function getRepliesForComment(
  req: NextRequest,
  params: { postId: string; commentId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const { postId, commentId } = params;

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "postId and commentId are required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId, moderationStatus: "VISIBLE" },
      select: { commentsDisabled: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.commentsDisabled) {
      return NextResponse.json(
        { error: "Comments for this post are disabled" },
        { status: 400 },
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");

    // Fetch one extra so we know if there's a next page
    const replies = await prisma.comment.findMany({
      where: { postId, parentId: commentId },
      take: REPLIES_PER_FETCH + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: "asc" },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
          },
        },
      },
    });

    const hasMore = replies.length > REPLIES_PER_FETCH;
    const pageReplies = hasMore ? replies.slice(0, REPLIES_PER_FETCH) : replies;

    return NextResponse.json({
      replies: pageReplies.map(withCommentActorIdentity),
      // Only set a cursor when there are genuinely more items to fetch
      nextCursor: hasMore ? pageReplies[pageReplies.length - 1].id : null,
    });
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching replies" },
      { status: 500 },
    );
  }
}
