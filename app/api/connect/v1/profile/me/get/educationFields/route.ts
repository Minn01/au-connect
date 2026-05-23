// TODO: file to be deleted api route is unused

import { NextRequest } from "next/server";
import { getMyEducation } from "@/lib/educationFunctions";

export async function GET(req: NextRequest) {
  return getMyEducation(req);
}
