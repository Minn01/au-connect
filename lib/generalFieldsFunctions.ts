import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";
import { safeUserSelect } from "@/lib/safeUserCall";
import { requestUserEmbeddingRefresh } from "@/lib/server/userEmbeddingRefresh.server";

type EmbeddingRefreshRequester = (userId: string) => Promise<unknown>;

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
export async function updateGeneralFields(
  req: NextRequest,
  refreshEmbedding: EmbeddingRefreshRequester = requestUserEmbeddingRefresh,
  userStore: typeof prisma.user = prisma.user,
) {
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

    const previousUser = await userStore.findUnique({
      where: { id: userId },
      select: { title: true, about: true },
    });

    const updatedUser = await userStore.update({
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

    const embeddingFieldsChanged =
      (body.title !== undefined && previousUser?.title !== body.title) ||
      (body.about !== undefined && previousUser?.about !== body.about);

    if (embeddingFieldsChanged) {
      await refreshEmbedding(userId);
    }

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
