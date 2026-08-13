import { NextRequest, NextResponse } from "next/server";

import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

async function getAuthUserId(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;
  if (!token) return null;

  try {
    return verifyJwtToken(token).userId;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!OBJECT_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "A valid community ID is required" },
      { status: 400 },
    );
  }

  const community = await prisma.community.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!community || community.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Community not found" },
      { status: 404 },
    );
  }

  await prisma.communityFollow.upsert({
    where: {
      communityId_userId: {
        communityId: id,
        userId,
      },
    },
    update: {},
    create: {
      communityId: id,
      userId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!OBJECT_ID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "A valid community ID is required" },
      { status: 400 },
    );
  }

  await prisma.communityFollow.deleteMany({
    where: {
      communityId: id,
      userId,
    },
  });

  return NextResponse.json({ ok: true });
}
