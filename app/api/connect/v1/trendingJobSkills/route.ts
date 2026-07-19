import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const rawLimit = Number(req.nextUrl.searchParams.get("limit") ?? 5);
    const limit = Number.isInteger(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 20)
      : 5;

    const groupedSkills = await prisma.jobSkill.groupBy({
      by: ["skillId"],
      where: {
        jobPost: {
          status: "OPEN",
        },
      },
      _count: {
        skillId: true,
      },
      orderBy: {
        _count: {
          skillId: "desc",
        },
      },
      take: limit,
    });

    const skillIds = groupedSkills.map((skill) => skill.skillId);
    const skills = await prisma.skill.findMany({
      where: {
        id: {
          in: skillIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const skillNameById = new Map(skills.map((skill) => [skill.id, skill.name]));
    const maxCount = groupedSkills[0]?._count.skillId ?? 0;

    const trendingSkills = groupedSkills
      .map((skill) => {
        const count = skill._count.skillId;
        return {
          id: skill.skillId,
          name: skillNameById.get(skill.skillId),
          count,
          percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
        };
      })
      .filter(
        (skill): skill is {
          id: string;
          name: string;
          count: number;
          percentage: number;
        } => Boolean(skill.name),
      );

    return NextResponse.json({
      skills: trendingSkills,
    });
  } catch (error) {
    console.error("Error fetching trending job skills:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
