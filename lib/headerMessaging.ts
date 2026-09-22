import { BASE_API_PATH } from "@/lib/constants";
import { useActorStore } from "@/lib/stores/actorStore";

function messageActorQuery() {
  const selectedActor = useActorStore.getState().selectedActor;
  const params = new URLSearchParams({ actorType: selectedActor.type });

  if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
    params.set("communityId", selectedActor.communityId);
  }

  return params.toString();
}

export async function fetchUnreadMessagesCount() {
  const res = await fetch(`${BASE_API_PATH}/messages/unread-count?${messageActorQuery()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch unread messages count");
  return res.json() as Promise<{ count: number }>;
}
