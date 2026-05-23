// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  BASE_API_PATH,
  CONNECT_PAGE_PATH,
  JOBS_PAGE_PATH,
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
  JOBS_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
];

const PUBLIC_API_ROUTES = [BASE_API_PATH + "/auth"];

export default function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get(JWT_COOKIE)?.value;
  const pathname = req.nextUrl.pathname;

  // 1. Public API routes
  if (PUBLIC_API_ROUTES.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Login page
  if (pathname.startsWith(SIGNIN_PAGE_PATH)) {
    if (sessionToken) {
      return verifySession(req, sessionToken, pathname);
    }
    return NextResponse.next();
  }

  // 3. Protected routes
  const isProtectedRoute = protectedRoutes.some((path) =>
    pathname.startsWith(path),
  );

  if (!sessionToken) {
    // if (isProtectedRoute || pathname.startsWith(BASE_API_PATH)) {
    //   // API calls → 401
    //   if (pathname.startsWith(BASE_API_PATH)) {
    //     return NextResponse.json(
    //       { error: "Unauthorized access to application api" },
    //       { status: 401 },
    //     );
    //   }
    //
    //   // Pages → redirect
    //   return NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
    // }
    //
    return NextResponse.next();
  }

  // 4. Token exists → verify
  return verifySession(req, sessionToken, pathname);
}

function verifySession(
  req: NextRequest,
  sessionToken: string,
  pathname: string,
) {
  try {
    const decoded = verifyJwtToken(sessionToken);

    const headers = new Headers(req.headers);
    headers.set("x-user-id", decoded.userId);
    headers.set("x-user-email", decoded.email);

    // If user visits login while authenticated → redirect home
    if (pathname.startsWith(SIGNIN_PAGE_PATH)) {
      return NextResponse.redirect(new URL(MAIN_PAGE_PATH, req.url));
    }

    return NextResponse.next({
      request: { headers },
    });
  } catch {
    const response = NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
    response.cookies.delete(JWT_COOKIE);
    return response;
  }
}

// IMPORTANT: Middleware must always run on /api routes
// Security depends on injected auth headers
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)).*)",
  ],
};
