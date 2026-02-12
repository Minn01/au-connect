"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/client/notifications.client";

import { timeAgo } from "@/lib/timeAgo";
import { buildSlug } from "@/app/profile/utils/buildSlug";

type NotificationType =
  | "CONNECTION_REQUEST"
  | "CONNECTION_ACCEPTED"
  | "POST_LIKED"
  | "POST_COMMENTED"
  | "COMMENT_REPLIED"
  | "POST_SHARED"
  | "POST_VOTED";

type Notification = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;

  entityId?: string; 

  fromUser?: {
    id: string;
    username: string;
    profilePic?: string;
  };
};

const notificationMessages: Record<NotificationType, string> = {
  CONNECTION_REQUEST: "sent you a connection request",
  CONNECTION_ACCEPTED: "accepted your connection request",
  POST_LIKED: "liked your post",
  POST_COMMENTED: "commented on your post",
  COMMENT_REPLIED: "replied to your comment",
  POST_SHARED: "shared your post",
  POST_VOTED: "voted on your poll",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = async (notification: Notification) => {
  // Mark as read
  if (!notification.isRead) {
    await markNotificationRead(notification.id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    );
  }

  // CONNECTION notifications → go to profile
  if (
    notification.type === "CONNECTION_REQUEST" ||
    notification.type === "CONNECTION_ACCEPTED"
  ) {
    if (notification.fromUser?.id) {
      const slug = buildSlug(
        notification.fromUser.username || "",
        notification.fromUser.id
      );
      router.push(`/profile/${slug}`);
    }
    return;
  }

  // POST + COMMENT notifications → go to post page
  if (notification.entityId) {
    router.push(`/posts/${notification.entityId}`);
  }
};


  return (
    <main className="min-h-screen bg-white">
      <div className="h-full overflow-y-auto flex flex-col items-center pt-6 px-4">
        <section className="w-full max-w-2xl">
          {/* HEADER */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-lg font-bold text-neutral-800">
              Notifications
            </h2>

            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}

            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await markAllNotificationsRead();
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, isRead: true }))
                  );
                }}
                className="ml-auto text-sm text-blue-600 hover:underline font-semibold"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* LOADING */}
          {loading && (
            <p className="text-neutral-500 text-sm">
              Loading notifications...
            </p>
          )}

          {/* EMPTY STATE */}
          {!loading && notifications.length === 0 && (
            <div className="py-20 text-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                No notifications yet
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                When someone interacts with you, notifications will appear here.
              </p>
            </div>
          )}

          {/* LIST */}
          <div className="space-y-4">
            {notifications.map((notification) => {
              const fromUser = notification.fromUser;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`group relative overflow-hidden rounded-2xl p-6 border cursor-pointer transition-all duration-300 ${
                    notification.isRead
                      ? "bg-neutral-50 border-neutral-200 hover:shadow-lg"
                      : "bg-blue-50 border-blue-200 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* AVATAR */}
                    <div className="relative">
                      <div className="relative h-14 w-14 rounded-xl overflow-hidden">
                        <Image
                          src={fromUser?.profilePic || "/default_profile.jpg"}
                          alt={fromUser?.username || "User"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      {!notification.isRead && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* TEXT */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">
                        <span className="font-bold">
                          {fromUser?.username || "Someone"}
                        </span>{" "}
                        {notificationMessages[notification.type]}
                      </p>

                      <span className="text-xs text-neutral-500 mt-1 block">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
