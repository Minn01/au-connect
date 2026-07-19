import { redirect } from "next/navigation";
import PostModalClient from "@/app/components/PostModalClient";
import { getPostWithMedia } from "@/lib/postHelpers";
import getCurrentUser from "@/lib/getCurrentUser";

export default async function PostModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ media?: string }>;
}) {
  const { postId } = await params;
  const { media } = await searchParams;

  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/");
  }

  const { userId } = auth;
  const post = await getPostWithMedia(postId, userId);

  if (!post) {
    redirect("/");
  }

  if (post.removedByModeration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-7 text-center shadow-xl">
          <h2 className="text-xl font-semibold text-gray-900">Removed by moderation</h2>
          <p className="mt-2 text-sm text-gray-600">
            This post is no longer visible to anyone else.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PostModalClient
      post={post}
      initialIndex={media ? parseInt(media, 10) : 0}
    />
  );
}
