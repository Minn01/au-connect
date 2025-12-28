import { NextRequest } from "next/server";

import { createComments, getCommentsForPost } from "@/lib/commentFunctions";

// create comment/reply on a post
export async function POST(
  req: NextRequest,
context: { params: Promise<{ postId: string }> }
) {
    const params = await context.params;
    return await createComments(req, params);
}

// get comments for a post
// GET /api/connect/v1/posts/:postId/comments?cursor=<optional>
export async function GET(
  req: NextRequest,
context: { params: Promise<{ postId: string }> }
) {
    const params = await context.params;
    return await getCommentsForPost(req, params);
}

