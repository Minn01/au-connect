import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DraftState {
  postType: string;
  title: string;
  content: string;
  visibility: string;
  disableComments: boolean;
  // Store minimal media info (not the actual files)
  mediaFileNames: string[];
  hasUnsavedWork: boolean;
}

interface DraftStore {
  draft: DraftState;
  saveDraft: (draft: Omit<DraftState, "hasUnsavedWork">) => void;
  clearDraft: () => void;
  hasDraft: () => boolean;
}

const initialDraft: DraftState = {
  postType: "media",
  title: "",
  content: "",
  visibility: "everyone",
  disableComments: false,
  mediaFileNames: [],
  hasUnsavedWork: false,
};

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      draft: initialDraft,

      saveDraft: (draft) =>
        set({
          draft: { ...draft, hasUnsavedWork: true },
        }),

      clearDraft: () => set({ draft: initialDraft }),

      hasDraft: () => {
        const { content, title, mediaFileNames } = get().draft;
        return !!(content || title || mediaFileNames.length > 0);
      },
    }),
    {
      name: "create-post-draft", // localStorage key
    },
  ),
);
