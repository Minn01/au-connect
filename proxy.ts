// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  CONNECT_PAGE_PATH,
  JWT_COOKIE,
  MAIN_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  PROFILE_PAGE_PATH,
  SIGNIN_PAGE_PATH,
} from "@/lib/constants";
import { verifyJwtToken } from "./lib/authFunctions";

const protectedRoutes = [
  ONBOARD_PAGE_PATH,
  MAIN_PAGE_PATH,
  CONNECT_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
];

export default function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get(JWT_COOKIE)?.value;

  const isProtectedRoute = protectedRoutes.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );
  const isRegisterPage = req.nextUrl.pathname.startsWith(SIGNIN_PAGE_PATH);

  if (isRegisterPage) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    if (isProtectedRoute) {
      const loginUrl = new URL(SIGNIN_PAGE_PATH, req.url);

      // add redirect query param to return user after login
      // loginUrl.searchParams.set('from', req.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // verify token
  try {
    const decoded = verifyJwtToken(sessionToken);
    const header = new Headers(req.headers);
    header.set("x-user-id", decoded.userId);
    header.set("x-user-email", decoded.email);
    return NextResponse.next({
      request: {
        headers: header,
      },
    });
  } catch (error) {
    // invalid token
    console.log("Invalid token:", error);
    const response = NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
    response.cookies.delete(JWT_COOKIE);
    return response;
  }
}

// configure which routes middleware runs on
export const config = {
  matcher: [
    "/",
    "/auth/onboarding",
    "/profile",
    "/connect",
    "/messages",
    "/notifications",
    // "/api/:path*",
  ],
};
