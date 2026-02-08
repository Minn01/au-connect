import prisma from "./prisma";

export async function createNotification({
  userId,
  fromUserId,
  type,
  entityId,
}: {
  userId: string;
  fromUserId: string;
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED";
  entityId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      fromUserId,
      type,
      entityId,
    },
  });
}

export async function fetchNotifications() {
  const res = await fetch("/api/connect/v1/notifications", {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string) {
  await fetch(`/api/connect/v1/notifications/${id}`, {
    method: "PATCH",
    credentials: "include",
  });
}

export async function fetchUnreadCount() {
  const res = await fetch(
    "/api/connect/v1/notifications/unread-count",
    { credentials: "include" }
  );

  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(
    "/api/connect/v1/notifications/mark-all-read",
    {
      method: "PATCH",
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return res.json();
}

