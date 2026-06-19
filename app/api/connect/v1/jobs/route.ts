import { getHeaderUserInfo } from "@/lib/authFunctions";
import { POSTS_PER_FETCH } from "@/lib/constants";
import {
  EmploymentType,
  JobLocationType,
  Prisma,
} from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json(
      { error: "Unauthorized action please sign in again" },
      { status: 401 },
    );
  }

  // query parameters
  const cursor = req.nextUrl.searchParams.get("cursor");
  const keyword = req.nextUrl.searchParams.get("keyword");
  const empType = req.nextUrl.searchParams.get("empType");
  const locType = req.nextUrl.searchParams.get("locType");
  const salaryRange = req.nextUrl.searchParams.get("salaryRange");

  // Base conditions inside the jobPost relation
  const jobPostConditions: Prisma.JobPostWhereInput = {};

  if (keyword) {
    jobPostConditions.OR = [
      { jobTitle: { contains: keyword, mode: "insensitive" } },
      { companyName: { contains: keyword, mode: "insensitive" } },
      { location: { contains: keyword, mode: "insensitive" } },
      { jobDetails: { contains: keyword, mode: "insensitive" } },
    ];
  }

  if (empType) {
    jobPostConditions.employmentType = empType as EmploymentType;
  }

  if (locType) {
    jobPostConditions.locationType = locType as JobLocationType;
  }

  if (salaryRange) {
    jobPostConditions.salaryMin = {
      gte: Number(salaryRange),
    };
  }

  // Building the final dynamic query
  const where: Prisma.PostWhereInput = {
    jobPost: {
      isNot: null,
      is:
        Object.keys(jobPostConditions).length > 0
          ? jobPostConditions
          : undefined,
    },
  };

  // Fetch from database
  const posts = await prisma.post.findMany({
    take: POSTS_PER_FETCH,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
    where,
    orderBy: { createdAt: "desc" },
    include: {
      // Added interactions array to prevent runtime crashes in .map()
      interactions: {
        where: { userId },
        select: { type: true },
      },
      jobPost: {
        select: {
          id: true,
          jobTitle: true,
          companyName: true,
          location: true,
          locationType: true,
          employmentType: true,
          positionsAvailable: true,
          positionsFilled: true,
          status: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          deadline: true,
          jobDetails: true,
          jobRequirements: true,
          applyUrl: true,
          allowExternalApply: true,
          applications: {
            where: {
              applicantId: userId,
            },
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
      },
    },
  });

  // Formatting the payload data safely
  const formattedData = posts.map((post) => {
    // Safely fallback to an empty array if interactions wasn't included correctly
    const isSaved = (post.interactions || []).some(
      (interaction) => interaction.type === "SAVED",
    );

    return {
      ...post,
      isSaved,
      jobPost: post.jobPost
        ? {
            ...post.jobPost,
            positionsFilled: post.jobPost.positionsFilled,
            remainingPositions:
              post.jobPost.positionsAvailable - post.jobPost.positionsFilled,
            hasApplied: post.jobPost.applications.length > 0,
            applicationStatus: post.jobPost.applications[0]?.status ?? null,
          }
        : null,
    };
  });

  console.log("JOBS: \n", formattedData);

  return NextResponse.json({
    jobs: formattedData,
    nextCursor: posts.length ? posts[posts.length - 1].id : null,
  });
}
