"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronRight, Megaphone, X } from "lucide-react";

import { fetchAnnouncements } from "@/lib/announcementFunctions";
import AnnouncementsSection from "./AnnouncementsSection";

export default function MobileAnnouncementsEntry() {
  const [open, setOpen] = useState(false);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const announcements =
    data?.pages.flatMap((page) => page.announcements) ?? [];
  const latestAnnouncement = announcements[0];
  const countLabel = isLoading
    ? "Loading"
    : announcements.length > 0
      ? `${announcements.length} update${announcements.length === 1 ? "" : "s"}`
      : "No updates";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-lg border border-red-100 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] active:bg-red-50 lg:hidden"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <Megaphone className="h-5 w-5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-950">
              Announcements
            </span>
            <span className="shrink-0 text-xs font-medium text-red-600">
              {countLabel}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {latestAnnouncement?.title ?? "Check campus updates"}
          </span>
        </span>

        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-announcements-title"
            onClick={() => setOpen(false)}
          >
            <div
              className="max-h-[82vh] w-full max-w-md overflow-hidden rounded-2xl bg-white text-slate-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-5 text-white">
                <div className="min-w-0">
                  <h2
                    id="mobile-announcements-title"
                    className="text-base font-semibold text-white"
                  >
                    Announcements
                  </h2>
                  <p className="text-xs text-blue-100">{countLabel}</p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/80 transition hover:bg-white/20 hover:text-white"
                  aria-label="Close announcements"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-4 py-4">
                <AnnouncementsSection
                  className="mt-0"
                  listClassName="max-h-[calc(82vh-8rem)] overflow-y-auto space-y-3"
                />
              </div>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
