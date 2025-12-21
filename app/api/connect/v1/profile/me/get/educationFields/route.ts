import { NextRequest } from "next/server";
import { getMyEducation } from "@/lib/educationFunctions";

export async function GET(req: NextRequest) {
  return getMyEducation(req);
}
