import { NextRequest } from "next/server";
import { addEducation } from "@/lib/educationFunctions";

export async function POST(req: NextRequest) {
  return addEducation(req);
}
