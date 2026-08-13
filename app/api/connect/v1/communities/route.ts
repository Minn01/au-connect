import { NextRequest, NextResponse } from "next/server";

import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

function communitySelect(currentUserId: string) {
  return {
    id: true,
    name: true,
    slug: true,
    about: true,
    location: true,
    profilePic: true,
    coverPhoto: true,
    status: true,
    _count: {
      select: {
        followers: true,
        posts: true,
      },
    },
    followers: {
      where: { userId: currentUserId },
      select: { id: true },
      take: 1,
    },
  };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No token", communities: [] },
      { status: 401 },
    );
  }

  let decoded;

  try {
    decoded = verifyJwtToken(token);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid token",
        communities: [],
      },
      { status: 401 },
    );
  }

  try {
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

    const communities = await prisma.community.findMany({
      where: {
        status: "ACTIVE",
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { about: { contains: search, mode: "insensitive" } },
                { location: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: communitySelect(decoded.userId),
    });

    const normalized = communities.map((community) => ({
      ...community,
      isFollowing: community.followers.length > 0,
      followers: undefined,
    }));

    return NextResponse.json({
      communities: normalized,
      followedCommunities: normalized.filter((community) => community.isFollowing),
      availableCommunities: normalized.filter(
        (community) => !community.isFollowing,
      ),
    });
  } catch (error) {
    console.error("Fetch communities failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch communities", communities: [] },
      { status: 500 },
    );
  }
}
