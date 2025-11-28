import { NextRequest } from "next/server";

import { azurezAdAuthSignIn } from "@/lib/authFunctions";

export async function GET(req: NextRequest) {
   return azurezAdAuthSignIn(req);
}
