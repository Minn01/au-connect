import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";
import { requestUserEmbeddingRefresh } from "@/lib/server/userEmbeddingRefresh.server";

type EmbeddingRefreshRequester = (userId: string) => Promise<unknown>;

/* =========================
   VALIDATION
========================= */
function validateExperience(body: any) {
  const {
    title,
    employmentType,
    company,
    startMonth,
    startYear,
    endMonth,
    endYear,
    isCurrent,
  } = body;

  if (!title || !employmentType || !company) {
    return "Title, employment type, and company are required";
  }

  if (startMonth === undefined || startYear === undefined) {
    return "Start date is required";
  }

  if (!isCurrent) {
    if (endMonth === undefined || endYear === undefined) {
      return "End date is required if not currently working";
    }

    const startValue = startYear * 12 + startMonth;
    const endValue = endYear * 12 + endMonth;

    if (endValue <= startValue) {
      return "End date must be later than start date";
    }
  }

  return null;
}

/* =========================
   GET MY EXPERIENCE
========================= */
// export async function getMyExperience(req: NextRequest) {
//   try {
//     const [userEmail, userId] = getHeaderUserInfo(req);

//     if (!userEmail || !userId) {
//       return NextResponse.json(
//         { error: "Unauthorized action please sign in again" },
//         { status: 401 }
//       );
//     }

//     const experience = await prisma.experience.findMany({
//       where: { userId },
//       orderBy: [
//         { startYear: "desc" },
//         { startMonth: "desc" },
//       ],
//     });

//     return NextResponse.json(experience, { status: 200 });
//   } catch (err) {
//     console.error("Get experience error:", err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

/* =========================
   ADD EXPERIENCE
========================= */
export async function addExperience(
  req: NextRequest,
  refreshEmbedding: EmbeddingRefreshRequester = requestUserEmbeddingRefresh,
  experienceStore: typeof prisma.experience = prisma.experience,
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
    const error = validateExperience(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const exp = await experienceStore.create({
      data: {
        title: body.title,
        employmentType: body.employmentType,
        company: body.company,
        startMonth: body.startMonth,
        startYear: body.startYear,
        endMonth: body.isCurrent ? null : body.endMonth,
        endYear: body.isCurrent ? null : body.endYear,
        isCurrent: Boolean(body.isCurrent),
        userId,
      },
    });

    await refreshEmbedding(userId);

    return NextResponse.json(exp, { status: 201 });
  } catch (err) {
    console.error("Add experience error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE EXPERIENCE
========================= */
export async function updateExperience(
  req: NextRequest,
  expId: string,
  refreshEmbedding: EmbeddingRefreshRequester = requestUserEmbeddingRefresh,
  experienceStore: typeof prisma.experience = prisma.experience,
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
    const error = validateExperience(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const existing = await experienceStore.findFirst({
      where: { id: expId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }

    const updated = await experienceStore.update({
      where: { id: expId },
      data: {
        title: body.title,
        employmentType: body.employmentType,
        company: body.company,
        startMonth: body.startMonth,
        startYear: body.startYear,
        endMonth: body.isCurrent ? null : body.endMonth,
        endYear: body.isCurrent ? null : body.endYear,
        isCurrent: Boolean(body.isCurrent),
      },
    });

    if (existing.title !== body.title) {
      await refreshEmbedding(userId);
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Update experience error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE EXPERIENCE
========================= */
export async function deleteExperience(
  req: NextRequest,
  expId: string,
  refreshEmbedding: EmbeddingRefreshRequester = requestUserEmbeddingRefresh,
  experienceStore: typeof prisma.experience = prisma.experience,
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const existing = await experienceStore.findFirst({
      where: { id: expId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }

    await experienceStore.delete({
      where: { id: expId },
    });

    await refreshEmbedding(userId);

    return NextResponse.json(
      { message: "Experience deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Delete experience error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
