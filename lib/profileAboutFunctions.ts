import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";

/* =========================
   VALIDATION
========================= */
function validateAbout(body: any) {
  const { about } = body;

  if (about === undefined) {
    return "About is required";
  }

  if (typeof about !== "string") {
    return "About must be a string";
  }

  if (about.length > 2600) {
    return "About must be 2600 characters or less";
  }

  return null;
}

/* =========================
   UPDATE ABOUT
========================= */
export async function updateAbout(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const error = validateAbout(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        about: body.about,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err) {
    console.error("Update about error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
