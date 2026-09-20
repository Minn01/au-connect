import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import {
  clampSkillSearchLimit,
  searchSkills,
} from "@/lib/server/skillSearch.server";

export async function GET(req: NextRequest) {
  try {
    getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = req.nextUrl.searchParams.get("q") ?? "";
  const limit = clampSkillSearchLimit(
    Number(req.nextUrl.searchParams.get("limit") ?? 10),
  );

  try {
    return NextResponse.json({ skills: await searchSkills(query, limit) });
  } catch (error) {
    console.error("Skill search failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Skill search failed" }, { status: 500 });
  }
}
