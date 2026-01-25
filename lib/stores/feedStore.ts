import { create } from "zustand";
import { RefObject } from "react";
import { VirtuosoHandle } from "react-virtuoso";

interface FeedStore {
  // State
  virtuosoRef: RefObject<VirtuosoHandle>;

  // Actions
  setVirtuosoRef: (ref: RefObject<VirtuosoHandle>) => void;
  scrollToTop: () => void;
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  // Initial state
  virtuosoRef: {} as RefObject<VirtuosoHandle>,

  // Actions (functions that modify state)
  setVirtuosoRef: (ref) =>
    set({
      virtuosoRef: ref,
    }),

  scrollToTop: () => {
    const ref = get().virtuosoRef;
    ref?.current?.scrollToIndex({
      index: 0,
      behavior: "smooth",
      align: "start",
    });
  },
}));
