import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";

const documentSchema = z.object({
  blobName: z.string().min(1),
  name: z.string().min(1),
  mimetype: z.string().min(1),
  size: z.number().positive(),
});

const submitSchema = z.object({
  role: z.enum(["STUDENT", "ALUMNI", "STAFF", "LECTURER"]),
  documentType: z.string().min(2).max(80),
  note: z.string().max(800).optional(),
  documents: z.array(documentSchema).min(1).max(5),
});

export async function GET(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, email: userEmail },
    select: {
      accountVerificationStatus: true,
      accountVerificationRole: true,
      verificationRequests: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          role: true,
          documentType: true,
          documents: true,
          note: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
          history: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              action: true,
              actor: true,
              note: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function POST(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, email: userEmail },
    select: { id: true, accountVerificationStatus: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.accountVerificationStatus === "APPROVED") {
    return NextResponse.json(
      { error: "This account is already verified" },
      { status: 409 },
    );
  }

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.accountVerificationRequest.create({
      data: {
        userId,
        role: parsed.data.role,
        documentType: parsed.data.documentType,
        documents: parsed.data.documents,
        note: parsed.data.note,
        status: "PENDING",
        history: {
          create: {
            action: "PENDING",
            actor: userId,
            note: "Submitted for admin review",
          },
        },
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        accountVerificationStatus: "PENDING",
        accountVerificationRole: parsed.data.role,
      },
    });

    return created;
  });

  return NextResponse.json({ request }, { status: 201 });
}
