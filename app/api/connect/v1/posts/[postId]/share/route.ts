import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ postId: string }> },
) {
  try {
    const params = await context.params;
    const { postId } = params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId is missing from params" },
        { status: 400},
      );
    }

    // Increment shareCount
    await prisma.post.update({
      where: { id: postId },
      data: {
        shareCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking share:", error);
    return NextResponse.json(
      { error: "Failed to track share" },
      { status: 500 },
    );
  }
}
