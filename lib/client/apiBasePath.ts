"use client";

/**
 * Client-side basePath handling for API calls.
 *
 * The app is served under a sub-path (`basePath` in next.config.ts, e.g.
 * /connect). Next.js automatically prefixes <Link>, <Image>, the router, and
 * asset URLs with the basePath — but it does NOT prefix `fetch()` calls. So
 * every hardcoded `fetch("/api/...")` in the app would hit the wrong path and
 * 404 under the sub-path.
 *
 * Instead of prefixing ~70 call sites by hand, we patch window.fetch once to
 * prepend the basePath to same-origin `/api/...` requests. This works the same
 * locally (localhost:3000/connect) and in production (life.au.edu/connect),
 * because only the domain differs — the /connect prefix is identical.
 *
 * Keep BASE_PATH in sync with `basePath` in next.config.ts.
 */
import { BASE_PATH } from "@/lib/basePath";
export { BASE_PATH };

function prefixApiPath(pathname: string): string {
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname; // already prefixed
  if (pathname.startsWith("/api/")) return `${BASE_PATH}${pathname}`;
  return pathname;
}

let installed = false;

/** Patch window.fetch to prepend the basePath to same-origin /api requests. */
export function installApiBasePath(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const origin = window.location.origin;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (typeof input === "string") {
        input = prefixApiPath(input);
      } else if (input instanceof URL) {
        if (input.origin === origin) input.pathname = prefixApiPath(input.pathname);
      } else if (input instanceof Request) {
        const u = new URL(input.url, origin);
        if (
          u.origin === origin &&
          u.pathname.startsWith("/api/") &&
          !u.pathname.startsWith(`${BASE_PATH}/`)
        ) {
          u.pathname = `${BASE_PATH}${u.pathname}`;
          input = new Request(u.toString(), input);
        }
      }
    } catch {
      /* on any parsing error, fall back to the original input */
    }
    return originalFetch(input as RequestInfo, init);
  };
}
