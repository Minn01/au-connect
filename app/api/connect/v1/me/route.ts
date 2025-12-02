import { NextRequest, NextResponse } from "next/server";
import { JWT_COOKIE } from "@/lib/constants";
import { verifyJwtToken } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(JWT_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      { user: null, error: "No token" },
      { status: 401 }
    );
  }

  let decoded;
  try {
    decoded = verifyJwtToken(token);
  } catch (error) {
    return NextResponse.json(
      { user: null, error: error },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    return NextResponse.json(
      { user: null, error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user: { ...user } });
}
