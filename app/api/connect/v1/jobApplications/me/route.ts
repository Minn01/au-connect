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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const myApplications = await prisma.jobApplication.findMany({
      where: {
        applicantId: userId,
        OR: [
          {
            status: "SHORTLISTED",
          },
          {
            status: "APPLIED",
            createdAt: {
              gte: thirtyDaysAgo,
            },
            jobPost: {
              status: "OPEN",
            },
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      include: {
        jobPost: {
          select: {
            id: true,
            jobTitle: true,
            companyName: true,
            status: true,
            deadline: true,
          },
        },
      },
    });

    console.log("My Applications");
    console.log(myApplications);

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
