import { useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

import {
  COMMENT_API_PATH,
  LOGOUT_API_PATH,
  ME_API_PATH,
  POST_API_PATH,
  REPLIES_API_PATH,
} from "@/lib/constants";

// calls /me
export async function fetchUser() {
  const res = await fetch(ME_API_PATH, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();
  return data.user;
}

// calls /logout
export async function handleLogout(redirect: () => void) {
  try {
    const res = await fetch(LOGOUT_API_PATH, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Logout failed");
    }

    redirect();
  } catch (e) {
    console.error("Logout error:", e instanceof Error ? e.message : e);
    return false;
  }
}

// calls /posts (POST)
export async function handleCreatePost(
  postType: string,
  title: string,
  postContent: string,
  selectedVisibility: string,
  disableComments: boolean,
  uploadedMedia: {
    blobName: string;
    type: string;
    name: string;
    mimetype: string;
    size: number;
  }[],
  setIsOpen: (state: boolean) => void
) {
  try {
    const res = await fetch(POST_API_PATH, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType,
        title,
        content: postContent,
        visibility: selectedVisibility,
        disableComments,
        media: uploadedMedia,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create post");
    }

    const createdPost = await res.json();
    setIsOpen(false);
    return createdPost;
  } catch (error) {
    console.error("Create post error:", error);
  }
}

// calls /posts (GET)
export async function fetchPosts({
  pageParam = null,
}: {
  pageParam?: string | null;
}) {
  const url = pageParam
    ? `${POST_API_PATH}?cursor=${pageParam}`
    : POST_API_PATH;

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Client side error; Failed to fetch posts");
  }

  return await res.json();
}

// calls /posts/:postId/comments
export async function createComment({
  postId,
  content,
  parentId,
}: {
  postId: string;
  content: string;
  parentId?: string;
}) {
  const res = await fetch(COMMENT_API_PATH(postId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      parentId,
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to create comment");
  }

  return res.json();
}


export function useTopLevelComments(postId: string) {
  return useInfiniteQuery({
    queryKey: ["comments", postId],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const res = await fetch(
        COMMENT_API_PATH(postId) +
          (pageParam ? `?cursor=${pageParam}` : "")
      );

      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json(); // must return { comments, nextCursor }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}

export async function fetchReplies({
  postId,
  commentId,
  cursor,
}: {
  postId: string;
  commentId: string;
  cursor?: string | null;
}) {
  const params = cursor ? `?cursor=${cursor}` : "";
  const res = await fetch(
    `${REPLIES_API_PATH(postId, commentId)}${params}`
  );

  if (!res.ok) throw new Error("Failed to fetch replies");
  return res.json();
}

export function useReplies(postId: string, commentId: string) {
  return useInfiniteQuery({
    queryKey: ["replies", commentId],
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      fetchReplies({
        postId,
        commentId,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
  });
}