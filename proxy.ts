// proxy.ts
import { NextResponse } from "next/server";
import type { NextProxy, NextRequest } from "next/server";

import {
  ACCOUNT_RESTRICTED_PAGE_PATH,
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
import { getAccountRestriction } from "./lib/accountStatus";

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

// Public, no-auth pages so Facebook/LinkedIn crawlers can read OG tags.
const PUBLIC_PAGE_ROUTES = ["/share"];

export const proxy: NextProxy = async (req: NextRequest) => {
  const sessionToken = req.cookies.get(JWT_COOKIE)?.value;
  const pathname = req.nextUrl.pathname;

  // 1. Public API routes
  if (PUBLIC_API_ROUTES.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 1b. Public share-preview pages (crawlers have no session cookie).
  if (PUBLIC_PAGE_ROUTES.some((path) => pathname.startsWith(path))) {
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
    if (isProtectedRoute || pathname.startsWith(BASE_API_PATH)) {
      // API calls → 401
      if (pathname.startsWith(BASE_API_PATH)) {
        return NextResponse.json(
          { error: "Unauthorized access to application api" },
          { status: 401 },
        );
      }

      // Pages → redirect
      return NextResponse.redirect(new URL(SIGNIN_PAGE_PATH, req.url));
    }

    return NextResponse.next();
  }

  // 4. Token exists → verify
  return verifySession(req, sessionToken, pathname);
}

async function verifySession(
  req: NextRequest,
  sessionToken: string,
  pathname: string,
) {
  try {
    const decoded = verifyJwtToken(sessionToken);

    const restriction = await getAccountRestriction(decoded.userId);

    if (restriction) {
      if (pathname.startsWith(BASE_API_PATH)) {
        const response = NextResponse.json(
          {
            error: restriction.status === "BANNED"
              ? "This account has been banned"
              : "This account is suspended",
            accountStatus: restriction.status,
            suspendedUntil: restriction.suspendedUntil,
          },
          { status: 403 },
        );
        return response;
      }

      if (!pathname.startsWith(ACCOUNT_RESTRICTED_PAGE_PATH)) {
        return NextResponse.redirect(new URL(ACCOUNT_RESTRICTED_PAGE_PATH, req.url));
      }
    } else if (pathname.startsWith(ACCOUNT_RESTRICTED_PAGE_PATH)) {
      return NextResponse.redirect(new URL(MAIN_PAGE_PATH, req.url));
    }

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
