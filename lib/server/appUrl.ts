import "server-only";

import { BASE_PATH } from "@/lib/basePath";

type RequestContext = {
  headers: Pick<Headers, "get">;
  url?: string;
};

function normalizeAppUrl(value: string, source: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${source} must be an absolute URL ending in ${BASE_PATH}`);
  }

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    url.hostname,
  );

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/+$/, "") !== BASE_PATH ||
    (process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !isLoopback)
  ) {
    throw new Error(
      `${source} must be an absolute HTTPS URL ending in ${BASE_PATH} (HTTP is allowed only for local development)`,
    );
  }

  return `${url.origin}${BASE_PATH}`;
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

function requestOrigin(request: RequestContext): string | null {
  const forwardedHost = firstForwardedValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = forwardedHost || firstForwardedValue(request.headers.get("host"));
  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );

  let requestUrl: URL | null = null;
  if (request.url) {
    try {
      requestUrl = new URL(request.url);
    } catch {
      requestUrl = null;
    }
  }

  const protocol = forwardedProtocol || requestUrl?.protocol.replace(":", "");
  if (host && protocol && ["http", "https"].includes(protocol)) {
    return new URL(`${protocol}://${host}`).origin;
  }

  return requestUrl?.origin ?? null;
}

/**
 * Return this deployment's externally visible URL, including /connect.
 * APP_PUBLIC_URL is read at runtime. Request handlers may instead derive the
 * URL from forwarded request headers; background work must configure the env.
 */
export function getAppUrl(request?: RequestContext): string {
  const configuredUrl = process.env.APP_PUBLIC_URL?.trim();
  if (configuredUrl) {
    return normalizeAppUrl(configuredUrl, "APP_PUBLIC_URL");
  }

  if (request) {
    const origin = requestOrigin(request);
    if (origin) {
      return normalizeAppUrl(`${origin}${BASE_PATH}`, "request origin");
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:3000${BASE_PATH}`;
  }

  throw new Error(
    `APP_PUBLIC_URL must be configured as an absolute URL ending in ${BASE_PATH} for production work without a request origin`,
  );
}

export type OAuthProvider = "google" | "linkedin" | "azure-ad";

export function getOAuthCallbackUrl(
  provider: OAuthProvider,
  request?: RequestContext,
): string {
  return `${getAppUrl(request)}/api/connect/v1/auth/${provider}/callback`;
}
