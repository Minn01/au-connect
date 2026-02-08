import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function PATCH(req: Request) {
  const userId = getAuthUserIdFromReq(req);

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
