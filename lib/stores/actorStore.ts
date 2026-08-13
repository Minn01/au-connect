import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActorType = "USER" | "COMMUNITY";

export type SelectedActor = {
  type: ActorType;
  communityId: string | null;
};

type ActorStore = {
  selectedActor: SelectedActor;
  useUserActor: () => void;
  useCommunityActor: (communityId: string) => void;
};

const userActor: SelectedActor = {
  type: "USER",
  communityId: null,
};

export const useActorStore = create<ActorStore>()(
  persist(
    (set) => ({
      selectedActor: userActor,
      useUserActor: () => set({ selectedActor: userActor }),
      useCommunityActor: (communityId) =>
        set({
          selectedActor: {
            type: "COMMUNITY",
            communityId,
          },
        }),
    }),
    {
      name: "au-connect-selected-actor",
    },
  ),
);
