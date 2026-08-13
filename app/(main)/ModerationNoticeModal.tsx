"use client";

import {
  MODERATION_NOTICE_API_PATH,
  MODERATION_NOTICES_API_PATH,
} from "@/lib/constants";
import { useEffect, useState } from "react";

type Notice = {
  id: string;
  action: string;
  reason: string | null;
  isRead: boolean;
  targetPost: { content: string; moderationStatus: string } | null;
};

export default function ModerationNoticeModal() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [acknowledgeError, setAcknowledgeError] = useState<string | null>(null);

  useEffect(() => {
    fetch(MODERATION_NOTICES_API_PATH)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load moderation notices");
        return response.json();
      })
      .then((unreadNotices: Notice[]) => setNotices(unreadNotices))
      .catch(() => undefined);
  }, []);

  const notice = notices[0];

  if (!notice) return null;

  async function acknowledge() {
    setIsAcknowledging(true);
    setAcknowledgeError(null);

    try {
      const response = await fetch(MODERATION_NOTICE_API_PATH(notice.id), {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Could not mark this warning as read.");
      }

      setNotices((currentNotices) => currentNotices.slice(1));
    } catch {
      setAcknowledgeError(
        "Something went wrong. Please try again before continuing.",
      );
    } finally {
      setIsAcknowledging(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold text-amber-700">Moderation notice</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">
          Your account received a warning
        </h2>
        {notice.reason && (
          <p className="mt-3 text-sm text-gray-700">{notice.reason}</p>
        )}
        {notice.targetPost && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="line-clamp-3">{notice.targetPost.content}</p>
            {notice.targetPost.moderationStatus === "REMOVED" && (
              <p className="mt-2 font-medium text-red-600">Removed by moderation</p>
            )}
          </div>
        )}
        {acknowledgeError && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {acknowledgeError}
          </p>
        )}
        <button
          type="button"
          onClick={acknowledge}
          disabled={isAcknowledging}
          className="mt-5 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAcknowledging ? "Saving..." : "I understand"}
        </button>
      </section>
    </div>
  );
}
