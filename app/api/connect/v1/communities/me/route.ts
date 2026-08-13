import { NextRequest, NextResponse } from "next/server";

import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { communities: [], error: "No token" },
      { status: 401 },
    );
  }

  let decoded;

  try {
    decoded = verifyJwtToken(token);
  } catch (error) {
    return NextResponse.json(
      { communities: [], error: error instanceof Error ? error.message : error },
      { status: 401 },
    );
  }

  try {
    const managements = await prisma.communityManager.findMany({
      where: {
        userId: decoded.userId,
        community: {
          status: "ACTIVE",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            profilePic: true,
            coverPhoto: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      communities: managements.map((item) => item.community),
    });
  } catch (error) {
    console.error("Fetch managed communities failed:", error);
    return NextResponse.json(
      { communities: [], error: "Failed to fetch managed communities" },
      { status: 500 },
    );
  }
}
