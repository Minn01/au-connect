import { NextRequest } from "next/server";
import { updateAbout } from "@/lib/profileAboutFunctions";

export async function PUT(req: NextRequest) {
  return updateAbout(req);
}
