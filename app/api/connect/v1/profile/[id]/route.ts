import prisma from "@/lib/prisma";
import { safeUserSelect } from "@/lib/safeUserCall";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const user = await prisma.user.findUnique({
      where: { id },
       select: safeUserSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong", details: err },
      { status: 500 }
    );
  }
}
