import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getHeaderUserInfo } from "./authFunctions";

/* =========================
   VALIDATION
========================= */
function validateEducation(body: any) {
  const {
    school,
    startMonth,
    startYear,
    endMonth,
    endYear,
  } = body;

  if (!school) {
    return "School is required";
  }

  if (startMonth === undefined || startYear === undefined) {
    return "Start date is required";
  }

  if (endMonth === undefined || endYear === undefined) {
    return "End date is required";
  }

  const startValue = startYear * 12 + startMonth;
  const endValue = endYear * 12 + endMonth;

  if (endValue <= startValue) {
    return "End date must be later than start date";
  }

  return null;
}

/* =========================
   GET MY EDUCATION (for later use)
========================= */
export async function getMyEducation(req: NextRequest) {
  try {
    const [userEmail, userId] = getHeaderUserInfo(req);

    if (!userEmail || !userId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    const education = await prisma.education.findMany({
      where: { userId },
      orderBy: [
        { startYear: "desc" },
        { startMonth: "desc" },
      ],
    });

    return NextResponse.json(education, { status: 200 });
  } catch (err) {
    console.error("Get education error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const error = validateEducation(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const edu = await prisma.education.create({
      data: {
        school: body.school,
        degree: body.degree || "",
        fieldOfStudy: body.fieldOfStudy || "",
        startMonth: body.startMonth,
        startYear: body.startYear,
        endMonth: body.endMonth,
        endYear: body.endYear,
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
    const error = validateEducation(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
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
      data: {
        school: body.school,
        degree: body.degree || "",
        fieldOfStudy: body.fieldOfStudy || "",
        startMonth: body.startMonth,
        startYear: body.startYear,
        endMonth: body.endMonth,
        endYear: body.endYear,
      },
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
