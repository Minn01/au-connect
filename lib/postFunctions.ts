import { NextResponse, NextRequest } from "next/server";
import prisma from "./prisma";

import { getHeaderUserInfo } from "./authFunctions";
import { CreatePostSchema } from "@/zod/PostSchema";

export async function createPost(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // parsing body with zod
    const parsed = CreatePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        email: userEmail,
      },
      select: { username: true, profilePic: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Problem fetching user data to create post" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        userId,
        username: user.username,
        profilePic: user.profilePic ?? "",
        ...data, // title, content, media
      },
    });

    console.log("From the server: \n" + post);

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function getAllPosts(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
