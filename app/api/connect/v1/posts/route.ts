import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import getCurrentUser from "@/lib/getCurrentUser";

// POST /api/posts  -> create a new post
export async function POST(req: NextRequest) {
  try {
    // 1. Check logged-in user from JWT cookie
    const auth = await getCurrentUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Read JSON body from request
    const { content, visibility } = await req.json();

    // 3. Validate content
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Post content is required" },
        { status: 400 }
      );
    }

    // 4. Create post in database
    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        userId: auth.userId,
        // If later you add "visibility" field in Prisma:
        // visibility: visibility ?? "everyone",
      },
      include: {
        user: true, // include author info if you need it on the frontend
      },
    });

    // 5. Return created post
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("Error creating post:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// (Optional) GET /api/posts -> list posts
export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  return NextResponse.json({ posts });
}
