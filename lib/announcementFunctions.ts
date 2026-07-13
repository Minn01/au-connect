import { ANNOUNCEMENTS_API_PATH } from "@/lib/constants";
import type { AnnouncementsResponse } from "@/types/Announcement";

export async function fetchAnnouncements({
  pageParam = null,
}: {
  pageParam?: unknown;
}) {
  const cursor = typeof pageParam === "string" ? pageParam : null;
  const url = cursor
    ? `${ANNOUNCEMENTS_API_PATH}?cursor=${cursor}`
    : ANNOUNCEMENTS_API_PATH;

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch announcements");
  }

  const data = (await res.json()) as AnnouncementsResponse;
  return data;
}
