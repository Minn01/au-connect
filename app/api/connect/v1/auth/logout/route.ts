import { NextResponse } from "next/server";
import { JWT_COOKIE, SIGNIN_PAGE_PATH } from "@/lib/constants";
import { NEXT_PUBLIC_BASE_URL } from "@/lib/env";

export async function DELETE() {
  try {
    // Create the redirect response
    const response = NextResponse.redirect(
        NEXT_PUBLIC_BASE_URL + SIGNIN_PAGE_PATH
    );

    // Delete the cookie properly
    response.cookies.set(JWT_COOKIE, "", {
      httpOnly: true,
      secure: process.env.ALLOW_HTTPS === "true",
      maxAge: 0,
      path: "/", // IMPORTANT
    });

    return response;
  } catch (error) {
    console.error("Logout API Error:", error);
    return NextResponse.json(
      { message: "Logout failed", error: String(error) },
      { status: 500 }
    );
  }
}
