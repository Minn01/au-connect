import { getHeaderUserInfo } from "@/lib/authFunctions";
import prisma from "@/lib/prisma";
import { CreateReportSchema } from "@/zod/ReportSchema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // user validation
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 },
      );
    }

    const body = await req.json();
    // zod schema safe parse validation
    const parsed = CreateReportSchema.safeParse(body);

    // parsing fail condition
    if (!parsed.success) {
      console.error("ZOD ERROR:", parsed.error.flatten());
      return NextResponse.json(
        {
          error: "Validation failed for reporting post",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const reportPayload = parsed.data;

    // check for duplicate reports by the same user
    const existingReport = await prisma.report.findUnique({
      where: {
        reporterId_targetType_targetId: {
          reporterId: userId,
          targetType: reportPayload.targetType,
          targetId: reportPayload.targetId,
        },
      },
      select: { id: true },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this target" },
        { status: 409 },
      );
    }

    // check whether reported post or user exists or not
    let targetExists = false;
    let snapshot = {};
    if (reportPayload.targetType === "POST") {
      const reportedPost = await prisma.post.findUnique({
        where: { id: reportPayload.targetId },
        select: {
          id: true,
          userId: true,
          username: true,
          profilePic: true,
          title: true,
          content: true,
          media: true,
          links: true,
        },
      });

      // self report own post check
      if (reportedPost && userId === reportedPost.userId) {
        return NextResponse.json(
          { error: "Action not allowed; cannot self report own post" },
          { status: 400 },
        );
      }

      targetExists = !reportedPost ? false : true;
      
      // if the reported post exist, store the snapshot of the post
      if (reportedPost) {
        snapshot = {
          reportedUsername: reportedPost.username,
          reportedProfilePic: reportedPost.profilePic,
          reportedTitle: reportedPost.title,
          reportedContent: reportedPost.content,
          ...(reportedPost.media !== null && {
            reportedMedia: reportedPost.media,
          }),
          ...(reportedPost.links !== null && {
            reportedLinks: reportedPost.links,
          }),
        };
      }
    } else if (reportPayload.targetType === "USER") {
      const reportedUser = await prisma.user.findUnique({
        where: { id: reportPayload.targetId },
        select: { id: true, username: true, profilePic: true },
      });

      // user self report check
      if (reportedUser && userId === reportedUser.id) {
        return NextResponse.json(
          { error: "Action not allowed; cannot self report user" },
          { status: 400 },
        );
      }

      targetExists = !reportedUser ? false : true;
      if (reportedUser) {
        snapshot = {
          reportedUsername: reportedUser.username,
          reportedProfilePic: reportedUser.profilePic,
        };
      }
    }

    if (!targetExists) {
      return NextResponse.json(
        { error: "The target of report doesn't exists" },
        { status: 400 },
      );
    }

    // report creation
    const report = await prisma.report.create({
      data: {
        ...reportPayload,
        reporterId: userId,
        ...snapshot,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 },
    );
  }
}
