import { NextRequest } from "next/server";
import { deleteMyProfilePic } from "@/lib/profilePhotoFunctions";

export async function DELETE(req: NextRequest) {
  return deleteMyProfilePic(req);
}
