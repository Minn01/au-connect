import { NextRequest, NextResponse } from "next/server";

import { getAnnouncementStatus } from "@/lib/announcementHelpers";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import { ANNOUNCEMENTS_PER_FETCH } from "@/lib/constants";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const now = new Date();
    const cursor = req.nextUrl.searchParams.get("cursor");

    const announcements = await prisma.announcement.findMany({
      take: ANNOUNCEMENTS_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      where: {
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        thumbnailBlobName: true,
        contentImageBlobName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      announcements: announcements.map((announcement) => ({
        ...announcement,
        status: getAnnouncementStatus(
          announcement.startDate,
          announcement.endDate
        ),
      })),
      nextCursor: announcements.length
        ? announcements[announcements.length - 1].id
        : null,
    });
  } catch (error) {
    console.error("Fetch announcements failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}
