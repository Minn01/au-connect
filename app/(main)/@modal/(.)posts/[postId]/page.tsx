"use client";

import { useRouter } from "next/navigation";
import PostDetailsModal from "@/app/components/PostDetailsModal";
import { usePost } from "@/app/profile/utils/fetchfunctions";

export default function PostModalPage({
  params,
}: {
  params: { postId: string };
}) {
  const router = useRouter();
  const { data: post, isLoading } = usePost(params.postId);

  if (isLoading || !post) return null;

  return (
    <PostDetailsModal
      postInfo={post}
      media={post.media}
      title={post.title}
      content={post.content}
      clickedIndex={0}
      onClose={() => router.back()}
    />
  );
}
