/**
 * Single source of truth for the app's basePath (see next.config.ts).
 *
 * Keep BASE_PATH in sync with `basePath` in next.config.ts. Client fetch() calls
 * are prefixed by installApiBasePath() (lib/client/apiBasePath.ts); local
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
