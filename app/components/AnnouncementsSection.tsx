"use client";

import { type UIEvent, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { fetchAnnouncements } from "@/lib/announcementFunctions";
import type { Announcement } from "@/types/Announcement";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementPreviewModal from "./AnnouncementPreviewModal";

function AnnouncementSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="h-28 bg-neutral-200" />
      <div className="p-4">
        <div className="h-3 bg-neutral-200 rounded w-24 mb-3" />
        <div className="h-4 bg-neutral-200 rounded w-4/5 mb-2" />
        <div className="h-3 bg-neutral-200 rounded w-full mb-2" />
        <div className="h-3 bg-neutral-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function AnnouncementsSection() {
  const [previewingAnnouncement, setPreviewingAnnouncement] =
    useState<Announcement | null>(null);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
  const announcements =
    data?.pages.flatMap((page) => page.announcements) ?? [];

  function handleAnnouncementsScroll(event: UIEvent<HTMLDivElement>) {
    if (!hasNextPage || isFetchingNextPage) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < 80) {
      fetchNextPage();
    }
  }

  return (
    <>
      <section className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">
            Announcements
          </h3>
          {!isLoading && (
            <span className="text-xs text-neutral-500">
              {announcements.length}
            </span>
          )}
        </div>

        <div
          onScroll={handleAnnouncementsScroll}
          className="max-h-[calc(100vh-19rem)] overflow-y-auto pr-2 space-y-3"
        >
          {isLoading ? (
            <>
              <AnnouncementSkeleton />
              <AnnouncementSkeleton />
            </>
          ) : announcements.length > 0 ? (
            announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onPreview={setPreviewingAnnouncement}
              />
            ))
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-5 text-center shadow-sm">
              <p className="text-sm font-medium text-neutral-800">
                No announcements for now
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Check back later for new updates.
              </p>
            </div>
          )}

          {isFetchingNextPage && <AnnouncementSkeleton />}
        </div>
      </section>

      {previewingAnnouncement && (
        <AnnouncementPreviewModal
          announcement={previewingAnnouncement}
          onClose={() => setPreviewingAnnouncement(null)}
        />
      )}
    </>
  );
}
