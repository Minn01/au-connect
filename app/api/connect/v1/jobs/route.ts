import { getHeaderUserInfo } from "@/lib/authFunctions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const [userEmail, userId] = getHeaderUserInfo(req);

  if (!userEmail || !userId) {
    return NextResponse.json(
      { error: "Unauthorized action please sign in again" },
      { status: 401 },
    );
  }

  const keyword = req.nextUrl.searchParams.get("keyword");
  const empType = req.nextUrl.searchParams.get("empType");
  const locType = req.nextUrl.searchParams.get("locType");
  const salaryRange = req.nextUrl.searchParams.get("salaryRange");
  const skills = req.nextUrl.searchParams.get("skills");

  return NextResponse.json({ message: "Hello from the jobs API!" });
}
