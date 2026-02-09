// "use client";
//
// import { useParams, useRouter, useSearchParams } from "next/navigation";
//
// import PostDetailsModal from "@/app/components/PostDetailsModal";
// import { usePost } from "@/app/profile/utils/fetchfunctions";
// import { useEffect } from "react";
// import { SHARE_POST_API_PATH, POST_DETAIL_PAGE_PATH } from "@/lib/constants";
//
// export default function PostPage() {
//   // get postId from url params
//   const { postId } = useParams<{ postId: string }>();
//
//   // get index from search params
//   const searchParams = useSearchParams();
//   const index = searchParams.get("media");
//
//   // ref is for tracking if user came from a shared link
//   const ref = searchParams.get("ref");
//
//   const router = useRouter();
//
//   const { data: post, isLoading } = usePost(postId);
//
//   // Track share when someone visits via shared link
//   useEffect(() => {
//     if (ref === "share" && postId) {
//       // Call API to increment share count
//       fetch(SHARE_POST_API_PATH(postId), {
//         method: "POST",
//       }).catch((err) => console.error("Failed to track share:", err));
//
//       // Clean up URL
//       const params = new URLSearchParams(searchParams.toString());
//       params.delete("ref");
//       router.replace(
//         POST_DETAIL_PAGE_PATH(postId, index ? parseInt(index, 10) : 0),
//         { scroll: false },
//       );
//     }
//   }, [ref, postId, router, searchParams]);
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
//       onClose={() => {
//         router.push("/");
//       }}
//     />
//   );
// }

import { redirect } from "next/navigation";
import PostPageClient from "@/app/components/PostPageClient";
import { getPostWithMedia } from "@/lib/postHelpers";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string; ref?: string }>;
}) {
  const { postId } = await params;
  const { media, ref } = await searchParams;

  const post = await getPostWithMedia(postId);

  if (!post) {
    redirect("/");
  }

  return (
    <PostPageClient
      post={post}
      postId={postId}
      initialIndex={media ? parseInt(media, 10) : 0}
      hasRefShare={ref === "share"}
    />
  );
}
