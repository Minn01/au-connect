import { notFound, redirect } from "next/navigation";
import PostPageClient from "@/app/components/PostPageClient";
import { getPostWithMedia } from "@/lib/postHelpers";
import getCurrentUser from "@/lib/getCurrentUser";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
	  searchParams: Promise<{
	    media?: string;
	    ref?: string;
	    by?: string;
	    community?: string;
	  }>;
}) {
  const { postId } = await params;
  const { media, ref, by, community } = await searchParams;

  const auth = await getCurrentUser();
  if (!auth) {
    redirect("/");
  }

  const { userId } = auth;
  const post = await getPostWithMedia(postId, userId);

  if (!post) {
    notFound();
  }

  if (post.removedByModeration) {
    return (
      <main className="mx-auto mt-8 max-w-2xl rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">Removed by moderation</h1>
        <p className="mt-2 text-sm text-gray-600">
          This post is no longer visible to anyone else.
        </p>
      </main>
    );
  }

  return (
    <PostPageClient
      post={post}
      postId={postId}
      initialIndex={media ? parseInt(media, 10) : 0}
	      hasRefShare={ref === "share"}
	      sharedByUserId={by ?? null}
	      sharedByCommunityId={community ?? null}
	    />
  );
}
