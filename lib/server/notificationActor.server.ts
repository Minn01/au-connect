import { NextRequest, NextResponse } from "next/server";
import { ActorType, Prisma } from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";
import { isValidObjectId } from "@/lib/communityAuth";

export type NotificationActorScope =
  | {
      actorType: "USER";
      communityId: null;
      where: Prisma.NotificationWhereInput;
    }
  | {
      actorType: "COMMUNITY";
      communityId: string;
      where: Prisma.NotificationWhereInput;
    };

export async function getNotificationActorScope(
  req: NextRequest,
  userId: string,
): Promise<NotificationActorScope | NextResponse> {
  const actorType = req.nextUrl.searchParams.get("actorType") as ActorType | null;
  const communityId = req.nextUrl.searchParams.get("communityId");

  if (actorType === "COMMUNITY") {
    if (!communityId || !isValidObjectId(communityId)) {
      return NextResponse.json(
        { error: "Valid communityId is required" },
        { status: 400 },
      );
    }

    const manager = await prisma.communityManager.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!manager) {
      return NextResponse.json(
        { error: "Unauthorized community notification access" },
        { status: 403 },
      );
    }

    return {
      actorType: "COMMUNITY",
      communityId,
      where: {
        recipientActorType: "COMMUNITY",
        recipientCommunityId: communityId,
      },
    };
  }

  return {
    actorType: "USER",
    communityId: null,
    where: {
      recipientActorType: "USER",
      userId,
    },
  };
}

export async function canAccessNotification(
  notificationId: string,
  userId: string,
) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      userId: true,
      recipientActorType: true,
      recipientCommunityId: true,
    },
  });

  if (!notification) return false;

  if (notification.recipientActorType === "USER") {
    return notification.userId === userId;
  }

  if (!notification.recipientCommunityId) return false;

  const manager = await prisma.communityManager.findUnique({
    where: {
      communityId_userId: {
        communityId: notification.recipientCommunityId,
        userId,
      },
    },
    select: { id: true },
  });

  return !!manager;
}
