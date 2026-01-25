"use client";

import { useQuery } from "@tanstack/react-query";

const DEFAULT_FALLBACK = "/default_profile.jpg";

function isHttpUrl(v: string) {
  return v.startsWith("http://") || v.startsWith("https://");
}

function isLocalPath(v: string) {
  return v.startsWith("/");
}

/**
 * Resolves a profilePic value into something safe for next/image:
 * - "/..." -> return as-is
 * - "http(s)://..." -> return as-is
 * - otherwise treat as Azure blobName and fetch signed URL via /fetch-media
 *
 * Uses react-query caching so the same blobName isn't fetched repeatedly.
 */
export function useResolvedMediaUrl(
  value: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK
) {
  const raw = (value ?? "").trim();

  const immediate =
    !raw ? fallback : isLocalPath(raw) || isHttpUrl(raw) ? raw : null;

  const shouldFetch = immediate === null;

  const { data } = useQuery({
    queryKey: ["media-url", raw],
    enabled: shouldFetch,
    queryFn: async () => {
      const res = await fetch(
        `/api/connect/v1/fetch-media?blobName=${encodeURIComponent(raw)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch media url");
      return json?.url as string;
    },
    staleTime: 8 * 60 * 1000, // 8 min (SAS is 10 min)
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });

  return immediate ?? data ?? fallback;
}
