import { useActorStore } from "@/lib/stores/actorStore";

function notificationActorQuery() {
  const selectedActor = useActorStore.getState().selectedActor;
  const params = new URLSearchParams({ actorType: selectedActor.type });

  if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
    params.set("communityId", selectedActor.communityId);
  }

  return params.toString();
}

export async function fetchNotifications() {
  const res = await fetch(`/api/connect/v1/notifications?${notificationActorQuery()}`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string) {
  const res = await fetch(`/api/connect/v1/notifications/${id}`, {
    method: "PATCH",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to mark notification as read");
  }
}

export async function fetchUnreadCount() {
  const res = await fetch(
    `/api/connect/v1/notifications/unread-count?${notificationActorQuery()}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(
    `/api/connect/v1/notifications/mark-all-read?${notificationActorQuery()}`,
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
