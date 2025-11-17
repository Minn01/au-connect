import { logout } from "@/lib/authFunctions";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
    return await logout(req);
}