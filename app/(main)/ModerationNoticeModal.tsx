"use client";

import { useEffect, useState } from "react";

type Notice = {
  id: string;
  action: string;
  reason: string | null;
  isRead: boolean;
  targetPost: { content: string; moderationStatus: string } | null;
};

export default function ModerationNoticeModal() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    fetch("/api/connect/v1/moderation-notices")
      .then((response) => (response.ok ? response.json() : []))
      .then((notices: Notice[]) => {
        setNotice(notices.find((item) => !item.isRead) ?? null);
      })
      .catch(() => undefined);
  }, []);

  if (!notice) return null;

  async function acknowledge() {
    await fetch(`/api/connect/v1/moderation-notices/${notice!.id}`, {
      method: "PATCH",
    });
    setNotice(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold text-amber-700">Moderation notice</p>
        <h2 className="mt-1 text-xl font-semibold text-gray-900">
          Your account received a warning
        </h2>
        {notice.reason && <p className="mt-3 text-sm text-gray-700">{notice.reason}</p>}
        {notice.targetPost && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="line-clamp-3">{notice.targetPost.content}</p>
            {notice.targetPost.moderationStatus === "REMOVED" && (
              <p className="mt-2 font-medium text-red-600">Removed by moderation</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={acknowledge}
          className="mt-5 w-full rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          I understand
        </button>
      </section>
    </div>
  );
}
