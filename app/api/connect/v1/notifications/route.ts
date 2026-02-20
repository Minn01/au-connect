import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            profilePic: true,
          },
        },
      },
    });

    const legacyJobApplicationEntityIds = notifications
      .filter((n) => n.type === "JOB_APPLICATION" && !!n.entityId)
      .map((n) => n.entityId as string);

    if (legacyJobApplicationEntityIds.length === 0) {
      return NextResponse.json(notifications);
    }

    const jobPosts = await prisma.jobPost.findMany({
      where: { id: { in: legacyJobApplicationEntityIds } },
      select: { id: true, postId: true },
    });

    const jobPostIdToPostId = new Map(jobPosts.map((j) => [j.id, j.postId]));

    const normalizedNotifications = notifications.map((notification) => {
      if (notification.type !== "JOB_APPLICATION" || !notification.entityId) {
        return notification;
      }

      const postId = jobPostIdToPostId.get(notification.entityId);

      if (!postId) return notification;

      return {
        ...notification,
        entityId: postId,
      };
    });

    return NextResponse.json(normalizedNotifications);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
