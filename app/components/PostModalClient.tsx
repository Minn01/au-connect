"use client";

import { useRouter } from "next/navigation";
import PostDetailsModal from "@/app/components/PostDetailsModal";
import PostType from "@/types/Post";

export default function PostModalClient({
  post,
  initialIndex,
}: {
  post: PostType;
  initialIndex: number;
}) {
  const router = useRouter();

  return (
    <PostDetailsModal
      postInfo={post}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={initialIndex}
      onClose={() => router.back()}
    />
  );
}
