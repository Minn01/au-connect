import { NextRequest } from "next/server";
import { saveMyProfilePic } from "@/lib/profilePhotoFunctions";

export async function POST(req: NextRequest) {
  return saveMyProfilePic(req);
}
