import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      userSkills: {
        orderBy: { order: "asc" },
        select: { skill: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ skills: user.userSkills.map(({ skill }) => skill) });
}
