import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { getNotificationActorScope } from "@/lib/server/notificationActor.server";

export async function PATCH(req: NextRequest) {
  const userId = getAuthUserIdFromReq(req);
  const scope = await getNotificationActorScope(req, userId);
  if (scope instanceof NextResponse) return scope;

  await prisma.notification.updateMany({
    where: { ...scope.where, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
