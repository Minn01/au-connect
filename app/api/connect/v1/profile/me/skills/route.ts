import { Prisma } from "@/lib/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import {
  ProfileSkillError,
  replaceProfileSkills,
} from "@/lib/server/profileSkills.server";

export async function PUT(req: NextRequest) {
  let userId: string;
  try {
    userId = getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    return NextResponse.json({
      skills: await replaceProfileSkills(userId, body?.skillIds),
    });
  } catch (error) {
    if (error instanceof ProfileSkillError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate skill selection" },
        { status: 400 },
      );
    }
    console.error("Profile skill update failed", {
      userId,
      code:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : "UNKNOWN",
    });
    return NextResponse.json({ error: "Unable to update skills" }, { status: 500 });
  }
}
