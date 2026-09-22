import { BASE_PATH } from "@/lib/basePath";
import { SHARE_POST_PAGE_PATH } from "@/lib/constants";

export function sharePostUrl(postId: string): string {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const origin = configuredUrl
    ? new URL(configuredUrl).origin
    : typeof window !== "undefined"
      ? window.location.origin
      : "";

  return `${origin}${BASE_PATH}${SHARE_POST_PAGE_PATH(postId)}`;
}
