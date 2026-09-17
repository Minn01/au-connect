"use client";

import { useState } from "react";
import Image from "next/image";
import { asset } from "@/lib/basePath";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Megaphone, X } from "lucide-react";

import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import type { Announcement } from "@/types/Announcement";

import AnnouncementPreviewSkeleton from "./AnnouncementPreviewSkeleton";

type AnnouncementPreviewModalProps = {
  announcement: Announcement;
  onClose: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function AnnouncementPreviewModal({
  announcement,
  onClose,
}: AnnouncementPreviewModalProps) {
  const thumbnailSrc = useResolvedMediaUrl(announcement.thumbnailBlobName, "");
  const contentImageSrc = useResolvedMediaUrl(
    announcement.contentImageBlobName,
    ""
  );
  const mediaItems = [
    thumbnailSrc && {
      src: thumbnailSrc,
      alt: `${announcement.title} thumbnail`,
    },
    contentImageSrc && {
      src: contentImageSrc,
      alt: `${announcement.title} content poster`,
    },
  ].filter(Boolean) as { src: string; alt: string }[];
  const [mediaIndex, setMediaIndex] = useState(0);
  const [loadedMediaSrc, setLoadedMediaSrc] = useState<string | null>(null);
  const currentMedia = mediaItems[mediaIndex] ?? mediaItems[0];
  const currentMediaLoaded = loadedMediaSrc === currentMedia?.src;
  const hasMultipleMedia = mediaItems.length > 1;
  const isMediaLoading =
    !thumbnailSrc ||
    (Boolean(announcement.contentImageBlobName) && !contentImageSrc);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  if (!portalTarget) {
    return null;
  }

  if (isMediaLoading) {
    return createPortal(
      <AnnouncementPreviewSkeleton onClose={onClose} />,
      portalTarget
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ display: "flex", maxWidth: "1100px" }}
      >
        <div className="relative hidden min-w-0 flex-[0_0_65%] items-center justify-center bg-black md:flex">
          {currentMedia ? (
            <>
              {!currentMediaLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="h-3/4 w-3/4 max-w-2xl animate-pulse rounded-xl bg-neutral-800">
                    <div className="h-full w-full -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                </div>
              )}
              <Image
                key={currentMedia.src}
                src={currentMedia.src}
                alt={currentMedia.alt}
                fill
                className={`object-contain transition-opacity duration-200 ${
                  currentMediaLoaded ? "opacity-100" : "opacity-0"
                }`}
                sizes="65vw"
                onLoad={() => setLoadedMediaSrc(currentMedia.src)}
                onError={() => setLoadedMediaSrc(currentMedia.src)}
                unoptimized
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Megaphone className="h-12 w-12" />
            </div>
          )}

          {hasMultipleMedia && mediaIndex > 0 && (
            <button
              type="button"
              onClick={() => setMediaIndex((current) => current - 1)}
              className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white"
              aria-label="Previous announcement image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {hasMultipleMedia && mediaIndex < mediaItems.length - 1 && (
            <button
              type="button"
              onClick={() => setMediaIndex((current) => current + 1)}
              className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow transition hover:bg-white"
              aria-label="Next announcement image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-slate-200">
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              <Image
                src={asset("/au-connect-logo.png")}
                alt="AU Connect"
                width={40}
                height={40}
                className="h-8 w-8 rounded-full object-contain"
              />
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                AU ANNOUNCEMENT
              </p>
              <p className="text-xs text-blue-100">
                {formatDate(announcement.startDate)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
              aria-label="Close announcement preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-xl font-semibold leading-7 text-slate-950">
                {announcement.title}
              </h2>
            </div>

            <div className="block bg-black md:hidden">
              {currentMedia && (
                <div className="relative h-[55vh] max-h-[55vh] w-full">
                  {!currentMediaLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="h-3/4 w-3/4 animate-pulse rounded-xl bg-neutral-800">
                        <div className="h-full w-full -translate-x-full animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
                      </div>
                    </div>
                  )}
                  <Image
                    key={currentMedia.src}
                    src={currentMedia.src}
                    alt={currentMedia.alt}
                    fill
                    className={`object-contain transition-opacity duration-200 ${
                      currentMediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    sizes="100vw"
                    onLoad={() => setLoadedMediaSrc(currentMedia.src)}
                    onError={() => setLoadedMediaSrc(currentMedia.src)}
                    unoptimized
                  />
                </div>
              )}
              {hasMultipleMedia && (
                <div className="flex items-center justify-center gap-3 p-3">
                  <button
                    type="button"
                    disabled={mediaIndex === 0}
                    onClick={() => setMediaIndex((current) => current - 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 disabled:opacity-40"
                    aria-label="Previous announcement image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={mediaIndex === mediaItems.length - 1}
                    onClick={() => setMediaIndex((current) => current + 1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 disabled:opacity-40"
                    aria-label="Next announcement image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
                {announcement.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
