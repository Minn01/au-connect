import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthUserIdFromReq(req);

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
