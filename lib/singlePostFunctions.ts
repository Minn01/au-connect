import { NextRequest, NextResponse } from "next/server";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

export async function getSinglePost(
  req: NextRequest,
  params: { postId: string },
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    // get postId from params
    const { postId } = params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 },
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: true,
        interactions: true,
        comments: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: "Internal server error; post(single) is not found!" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ...post,
      username: post.user.username,
      profilePic: post.user.profilePic,
    });
  } catch (error) {
    console.error("Failed to fetch post single:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching post; single" },
      { status: 500 },
    );
  }
}

