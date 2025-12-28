import { NextRequest } from "next/server";
import { getRepliesForComment } from "@/lib/commentFunctions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ postId: string; commentId: string }> }
) {
  const params = await context.params;
  return await getRepliesForComment(req, params);
}
