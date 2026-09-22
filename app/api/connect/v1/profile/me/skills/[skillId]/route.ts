import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import {
  ProfileSkillError,
  removeProfileSkill,
} from "@/lib/server/profileSkills.server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
) {
  let userId: string;
  try {
    userId = getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { skillId } = await params;
  try {
    await removeProfileSkill(userId, skillId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ProfileSkillError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Profile skill removal failed", { userId, skillId });
    return NextResponse.json({ error: "Unable to remove skill" }, { status: 500 });
  }
}
