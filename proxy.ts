// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  BASE_API_PATH,
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

// export default function middleware(req: NextRequest) {
//   const sessionToken = req.cookies.get(JWT_COOKIE)?.value;

//   const isProtectedRoute = protectedRoutes.some((path) =>
//     req.nextUrl.pathname.startsWith(path)
//   );
//   const isRegisterPage = req.nextUrl.pathname.startsWith(SIGNIN_PAGE_PATH);

//   if (isRegisterPage) {
//     return NextResponse.next();
//   }

//   if (!sessionToken) {
//     if (isProtectedRoute) {
//       const loginUrl = new URL(SIGNIN_PAGE_PATH, req.url);

//       // add redirect query param to return user after login
//       // loginUrl.searchParams.set('from', req.nextUrl.pathname);
//       return NextResponse.redirect(loginUrl);
//     }
//     return NextResponse.next();
//   }

//   // verify token
//   try {
//     const decoded = verifyJwtToken(sessionToken);
//     const header = new Headers(req.headers);
//     header.set("x-user-id", decoded.userId);
//     header.set("x-user-email", decoded.email);
//     return NextResponse.next({
//       request: {
//         headers: header,
//       },
//     });
//   } catch (error) {
//     // invalid token
//     console.log("Invalid token:", error);
//     const response = NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
//     response.cookies.delete(JWT_COOKIE);
//     return response;
//   }
// }

// // configure which routes middleware runs on

const PUBLIC_API_ROUTES = [
  BASE_API_PATH + "/auth"
];

export default function middleware(req: NextRequest) {
  const sessionToken = req.cookies.get(JWT_COOKIE)?.value;
  const pathname = req.nextUrl.pathname;

  // 1. Allow specific API routes with no auth
  if (PUBLIC_API_ROUTES.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 2. Allow public pages (login/register)
  if (pathname.startsWith(SIGNIN_PAGE_PATH)) {
    return NextResponse.next();
  }

  // 3. Check if route is protected
  const isProtectedRoute = protectedRoutes.some((path) =>
    pathname.startsWith(path)
  );

  if (!sessionToken) {
    if (isProtectedRoute || pathname.startsWith("/api")) {
      // API calls shouldn't redirect → return 401
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }

      // Pages redirect
      const loginUrl = new URL(SIGNIN_PAGE_PATH, req.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 4. If user has token, verify it
  try {
    const decoded = verifyJwtToken(sessionToken);
    const header = new Headers(req.headers);
    header.set("x-user-id", decoded.userId);
    header.set("x-user-email", decoded.email);

    return NextResponse.next({
      request: { headers: header },
    });
  } catch {
    // invalid token
    const response = NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
    response.cookies.delete(JWT_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    "/",
    "/auth/onboarding",
    "/profile",
    "/connect",
    "/messages",
    "/notifications",
    "/api/:path*",
  ],
};