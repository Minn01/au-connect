// "use client";
//
// import { useRouter, useParams, useSearchParams } from "next/navigation";
// import PostDetailsModal from "@/app/components/PostDetailsModal";
// import { usePost } from "@/app/profile/utils/fetchfunctions";
//
// export default function PostModalPage() {
//   const router = useRouter();
//
//   // get postId from url params
//   const { postId } = useParams<{ postId: string }>();
//
//   // get index from search params
//   const searchParams = useSearchParams();
//   const index = searchParams.get("media");
//
//   const { data: post, isLoading } = usePost(postId);
//
//   if (isLoading || !post) return null;
//
//   return (
//     <PostDetailsModal
//       postInfo={post}
//       media={post.media}
//       title={post.title}
//       content={post.content}
//       clickedIndex={index ? parseInt(index, 10) : 0}
//       onClose={() => router.back()}
//     />
//   );
// }

import { redirect } from "next/navigation";
import PostModalClient from "@/app/components/PostModalClient";
import { getPostWithMedia } from "@/lib/postHelpers";

export default async function PostModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { postId } = await params;
  const { media } = await searchParams;

  const post = await getPostWithMedia(postId);

  if (!post) {
    redirect("/");
  }

  return (
    <PostModalClient
      post={post}
      initialIndex={media ? parseInt(media, 10) : 0}
    />
  );
}
