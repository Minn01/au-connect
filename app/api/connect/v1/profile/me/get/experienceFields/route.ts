// TODO: file to be deleted api route is unused

import { NextRequest } from "next/server";
import { getMyExperience } from "@/lib/experienceFunctions";

export async function GET(req: NextRequest) {
  return getMyExperience(req);
}
