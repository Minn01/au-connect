"use client";

import { BASE_PATH } from "@/lib/basePath";
import { SHARE_POST_PAGE_PATH } from "@/lib/constants";

export function sharePostUrl(postId: string): string {
  return `${window.location.origin}${BASE_PATH}${SHARE_POST_PAGE_PATH(postId)}`;
}
