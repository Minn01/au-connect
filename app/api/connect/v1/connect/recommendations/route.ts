import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import { getConnectionRecommendations } from "@/lib/server/connectionRecommendations.server";

export async function GET(req: NextRequest) {
  let userId: string;

  try {
    userId = getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 10);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 10;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const result = await getConnectionRecommendations(userId, limit, cursor);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        data: { recommendations: [], nextCursor: null, hasMore: false },
        error: "Connection recommendations are temporarily unavailable",
      },
    );
  }

  return NextResponse.json({
    success: true,
    available: true,
    data: {
      recommendations: result.recommendations,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    },
    error: null,
  });
}
