/**
 * Single source of truth for the app's basePath (see next.config.ts).
 *
 * Keep BASE_PATH in sync with `basePath` in next.config.ts. Local
 * /public asset paths are prefixed by asset() below, because next/Image with
 * `unoptimized: true` does not add the basePath to a string src.
 */
export const BASE_PATH = "/connect";

/** Prefix a local /public asset path (e.g. "/logo.png") with the basePath. */
export function asset(path: string): string {
  if (!path.startsWith("/")) return path; // http(s):// or already-resolved URL
  if (path.startsWith(`${BASE_PATH}/`)) return path; // already prefixed
  return `${BASE_PATH}${path}`;
}

/** Convert a browser pathname to the path expected by the Next router. */
export function withoutBasePath(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  return pathname.startsWith(`${BASE_PATH}/`)
    ? pathname.slice(BASE_PATH.length)
    : pathname;
}
