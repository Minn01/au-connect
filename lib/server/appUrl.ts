import "server-only";

import { BASE_PATH } from "@/lib/basePath";

export function getAppUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === "production"
      ? ""
      : `http://localhost:3000${BASE_PATH}`);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL must be an absolute URL ending in /connect",
    );
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/+$/, "") !== BASE_PATH ||
    (process.env.NODE_ENV === "production" &&
      (url.protocol !== "https:" ||
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  ) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL must be a public HTTPS URL ending in /connect in production",
    );
  }

  return `${url.origin}${BASE_PATH}`;
}
