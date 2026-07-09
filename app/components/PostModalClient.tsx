"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchUser } from "../(main)/profile/utils/fetchfunctions";
import PostDetailsSkeleton from "@/app/components/PostDetailsSkeleton";
import PostType from "@/types/Post";
import PostArg from "@/types/PostArg";
import PostDetailsModal from "./PostDetailsModal";
import CreatePostModal from "./CreatePostModal";

export default function PostModalClient({
  post,
  initialIndex,
}: {
  post: PostArg;
  initialIndex: number;
}) {
  const router = useRouter();

  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const isJobPost = post.postType === "job_post";
  const hasMedia = (post.media?.length ?? 0) > 0 || post.postType === "poll";
  const sizeVariant: "job" | "media" | "compact" = isJobPost
    ? "job"
    : hasMedia
      ? "media"
      : "compact";
  const showLeftPane =
    (isJobPost && !!post.jobPost) || post.postType === "poll" || hasMedia;

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostType | null>(null);

  const setEditModalOpenAndCloseRoute: Dispatch<SetStateAction<boolean>> = (
    value,
  ) => {
    const nextOpen = typeof value === "function" ? value(editModalOpen) : value;
    setEditModalOpen(nextOpen);

    if (!nextOpen) {
      setEditingPost(null);
      router.back();
    }
  };

  if (userLoading || !user) {
    return (
      <PostDetailsSkeleton
        onClose={() => router.back()}
        sizeVariant={sizeVariant}
        showLeftPane={showLeftPane}
      />
    );
  }

  const postAsPostType = post as unknown as PostType;
  return (
    <>
      {!editModalOpen && (
        <PostDetailsModal
          currentUserId={user.id}
          postInfo={postAsPostType}
          media={post.media}
          title={post.title}
          content={post.content}
          clickedIndex={initialIndex}
          onClose={() => router.back()}
          onEdit={(selectedPost) => {
            setEditingPost(selectedPost);
            setEditModalOpen(true);
          }}
        />
      )}

      {editModalOpen && editingPost && (
        <CreatePostModal
          user={user}
          isOpen={editModalOpen}
          setIsOpen={setEditModalOpenAndCloseRoute}
          editMode={true}
          exisistingPost={editingPost}
        />
      )}
    </>
  );
}
