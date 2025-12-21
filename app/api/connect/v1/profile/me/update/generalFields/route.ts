import { NextRequest } from "next/server";
import { updateGeneralFields } from "@/lib/generalFieldsFunctions";

export async function POST(req: NextRequest) {
  return updateGeneralFields(req);
}
