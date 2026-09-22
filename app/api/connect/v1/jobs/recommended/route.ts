import { NextRequest, NextResponse } from "next/server";

import { getAuthUserIdFromReq } from "@/lib/getAuthUserIdFromReq";
import prisma from "@/lib/prisma";
import { getJobRecommendations } from "@/lib/server/jobRecommendations.server";
import { hydrateRecommendedJobs } from "@/lib/server/jobRecommendationHydration";

function requestedLimit(req: NextRequest) {
  const value = Number(req.nextUrl.searchParams.get("limit") ?? 6);
  return Number.isInteger(value) ? Math.min(Math.max(value, 1), 12) : 6;
}

export async function GET(req: NextRequest) {
  let userId: string;
  try {
    userId = getAuthUserIdFromReq(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = requestedLimit(req);
  const upstreamLimit = Math.min(limit * 3, 50);
  const recommendations = await getJobRecommendations(userId, upstreamLimit);
  if (!recommendations.ok) {
    console.warn("Job recommendations are unavailable", {
      userId,
      reason: recommendations.reason,
    });
    return NextResponse.json(
      {
        jobs: [],
        hasProfileSkills: false,
        available: false,
      },
    );
  }

  const candidateIds = recommendations.candidates.map(({ jobPostId }) => jobPostId);

  const [jobs, profile, connections] = await Promise.all([
    prisma.jobPost.findMany({
      where: {
        id: { in: candidateIds },
        status: "OPEN",
        OR: [
          { deadline: null },
          { deadline: { isSet: false } },
          { deadline: { gte: new Date() } },
        ],
        applications: { none: { applicantId: userId } },
        post: {
          moderationStatus: "VISIBLE",
          OR: [{ removedAt: null }, { removedAt: { isSet: false } }],
        },
      },
      select: {
        id: true,
        jobTitle: true,
        companyName: true,
        location: true,
        locationType: true,
        employmentType: true,
        status: true,
        positionsAvailable: true,
        positionsFilled: true,
        deadline: true,
        createdAt: true,
        jobSkills: { select: { skill: { select: { id: true, name: true } } } },
        applications: {
          where: { applicantId: userId },
          select: { id: true },
        },
        post: {
          select: {
            id: true,
            userId: true,
            actorType: true,
            visibility: true,
            moderationStatus: true,
            removedAt: true,
            community: { select: { status: true } },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        location: true,
        userSkills: { select: { skillId: true } },
      },
    }),
    prisma.connection.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      select: { userAId: true, userBId: true },
    }),
  ]);

  const connectedIds = new Set(
    connections.map((connection) =>
      connection.userAId === userId ? connection.userBId : connection.userAId,
    ),
  );
  const profileSkillIds = new Set(profile?.userSkills.map(({ skillId }) => skillId));
  const hydrated = hydrateRecommendedJobs({
    candidateIds,
    jobs,
    userId,
    profileSkillIds,
    profileLocation: profile?.location ?? null,
    connectedIds,
    limit,
  });

  if (candidateIds.length > 0 && hydrated.length === 0) {
    console.info("Job recommendations were removed during hydration", {
      userId,
      upstreamCandidates: candidateIds.length,
      databaseMatches: jobs.length,
    });
  }

  return NextResponse.json({
    jobs: hydrated,
    hasProfileSkills: (profile?.userSkills.length ?? 0) > 0,
    available: true,
  });
}
