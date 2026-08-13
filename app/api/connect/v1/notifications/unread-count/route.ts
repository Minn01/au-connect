import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { getNotificationActorScope } from "@/lib/server/notificationActor.server";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);
    const scope = await getNotificationActorScope(req, userId);
    if (scope instanceof NextResponse) return scope;

    const count = await prisma.notification.count({
      where: {
        ...scope.where,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
