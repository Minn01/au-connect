"use client";

import Image from "next/image";
import { CalendarDays, Eye, Megaphone } from "lucide-react";

import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import type { Announcement } from "@/types/Announcement";

function formatAnnouncementDate(startDate: string, endDate: string | null) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });
  const start = formatter.format(new Date(startDate));

  if (!endDate) {
    return start;
  }

  return `${start} - ${formatter.format(new Date(endDate))}`;
}

export default function AnnouncementCard({
  announcement,
  onPreview,
}: {
  announcement: Announcement;
  onPreview: (announcement: Announcement) => void;
}) {
  const thumbnailUrl = useResolvedMediaUrl(
    announcement.thumbnailBlobName,
    ""
  );

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-red-400 hover:shadow-md">
      <button
        type="button"
        onClick={() => onPreview(announcement)}
        className="grid w-full grid-cols-[88px_1fr] gap-3 text-left"
      >
        <div className="relative h-24 overflow-hidden rounded-md bg-slate-100">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={announcement.title}
              fill
              sizes="88px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Megaphone className="h-7 w-7" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
            {announcement.title}
          </h4>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5 text-red-600" />
            <span className="truncate">
              {formatAnnouncementDate(
                announcement.startDate,
                announcement.endDate
              )}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Eye className="h-4 w-4 text-red-500" />
          </div>
        </div>
      </button>
    </article>
  );
}
