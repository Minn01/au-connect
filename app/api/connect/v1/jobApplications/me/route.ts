import { NextRequest, NextResponse } from "next/server";

import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const myApplications = await prisma.jobApplication.findMany({
      where: {
        applicantId: userId,
        status: "APPLIED",

      },
      include: {
        jobPost: {
          include: {
            post: true,
          },
        },
      },
    });

    return NextResponse.json({
      applications: myApplications,
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching posts" },
      { status: 500 },
    );
  }
}
