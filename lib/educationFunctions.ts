import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";

/* =========================
   VALIDATION
========================= */
type EducationData = {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

function validateEducation(
  body: Record<string, unknown>
): { error: string } | { data: EducationData } {
  const school = typeof body.school === "string" ? body.school : "";
  const degree = typeof body.degree === "string" ? body.degree : "";
  const fieldOfStudy =
    typeof body.fieldOfStudy === "string" ? body.fieldOfStudy : "";

  // Coerce to numbers so string inputs (e.g. "5") don't break the math or
  // the Int columns. Number(null) is NaN, so this also catches null/undefined.
  const startMonth = Number(body.startMonth);
  const startYear = Number(body.startYear);
  const endMonth = Number(body.endMonth);
  const endYear = Number(body.endYear);

  if (!school) {
    return { error: "School is required" };
  }

  if (Number.isNaN(startMonth) || Number.isNaN(startYear)) {
    return { error: "Start date is required" };
  }

  if (Number.isNaN(endMonth) || Number.isNaN(endYear)) {
    return { error: "End date is required" };
  }

  const startValue = startYear * 12 + startMonth;
  const endValue = endYear * 12 + endMonth;

  if (endValue <= startValue) {
    return { error: "End date must be later than start date" };
  }

  return {
    data: {
      school,
      degree,
      fieldOfStudy,
      startMonth,
      startYear,
      endMonth,
      endYear,
    },
  };
}

/* =========================
   GET MY EDUCATION (for later use)
========================= */
// export async function getMyEducation(req: NextRequest) {
//   try {
//     const [userEmail, userId] = getHeaderUserInfo(req);

//     if (!userEmail || !userId) {
//       return NextResponse.json(
//         { error: "Unauthorized action please sign in again" },
//         { status: 401 }
//       );
//     }

//     const education = await prisma.education.findMany({
//       where: { userId },
//       orderBy: [
//         { startYear: "desc" },
//         { startMonth: "desc" },
//       ],
//     });

//     return NextResponse.json(education, { status: 200 });
//   } catch (err) {
//     console.error("Get education error:", err);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }

/* =========================
   ADD EDUCATION
========================= */
export async function addEducation(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = validateEducation(body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const edu = await prisma.education.create({
      data: {
        ...result.data,
        userId,
      },
    });

    return NextResponse.json(edu, { status: 201 });
  } catch (err) {
    console.error("Add education error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE EDUCATION
========================= */
export async function updateEducation(
  req: NextRequest,
  eduId: string
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
    const result = validateEducation(body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const existing = await prisma.education.findFirst({
      where: { id: eduId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Education not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.education.update({
      where: { id: eduId },
      data: result.data,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Update education error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE EDUCATION
========================= */
export async function deleteEducation(
  req: NextRequest,
  eduId: string
) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const existing = await prisma.education.findFirst({
      where: { id: eduId, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Education not found" },
        { status: 404 }
      );
    }

    await prisma.education.delete({
      where: { id: eduId },
    });

    return NextResponse.json(
      { message: "Education deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("Delete education error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
