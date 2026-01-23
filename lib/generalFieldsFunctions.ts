import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";
import { safeUserSelect } from "@/lib/safeUserCall";

/* =========================
   VALIDATION
========================= */
function validateGeneralFields(body: any) {
  const { username } = body;

  if (!username || username.trim().length < 3) {
    return "Username must be at least 3 characters long";
  }

  // letters, numbers, spaces, dots, underscores, dashes
  // must start with letter/number
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9 _.-]{2,29}$/;

  if (!usernameRegex.test(username.trim())) {
    return "Username can only contain letters, numbers, spaces, dots (.), underscores (_), and dashes (-), and must be 3–30 characters long.";
  }

  return null;
}

/* =========================
   UPDATE GENERAL PROFILE FIELDS
========================= */
export async function updateGeneralFields(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const error = validateGeneralFields(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: body.username.trim(),
        title: body.title,
        about: body.about,
        location: body.location,
        phoneNo: body.phoneNo,
        phonePublic: body.phonePublic,
        emailPublic: body.emailPublic,
      },
      select: safeUserSelect,
    });

    return NextResponse.json(
      { success: true, user: updatedUser },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update general fields error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
