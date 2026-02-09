import { ThumbsUp, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import PostType from "@/types/Post";
import User from "@/types/User";
import PostMediaGrid from "./PostMediaGrid";
import PostProfile from "./PostProfile";
import PostAttachments from "./PostAttachments";
import PostText from "./PostText";
import { useToggleLike, useDeletePost } from "../profile/utils/fetchfunctions";
import CreatePostModal from "./CreatePostModal";
import ShareModal from "../profile/components/ShareModal";
import { POST_DETAIL_PAGE_PATH } from "@/lib/constants";
import PostPoll from "./PostPoll";
import LinkEmbedPreview from "./Linkembedpreview";

export default function Post({
  user,
  post,
  isLoading,
}: {
  user?: User;
  post?: PostType;
  isLoading: boolean;
}) {
  if (!post) {
    return null;
  }

  const router = useRouter();
  const openPostModal = (postId: string, index: number) => {
    router.push(POST_DETAIL_PAGE_PATH(postId, index));
  };

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();

  // Skeleton UI
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!post) return null;

  const videosAndImages = post.media?.filter(
    (m) => m.type === "image" || m.type === "video",
  );

  const containsVideosOrImages = (videosAndImages?.length ?? 0) > 0;
  const attachments = post.media?.filter((m) => m.type === "file");

  const numOfCommentsContent = (post: PostType) => {
    if (post.commentsDisabled) {
      return "";
    }

    if (post.numOfComments && post.numOfComments > 0) {
      return `${post.numOfComments} comments`;
    }

    return "0 comments";
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <PostProfile
        post={post}
        currentUserId={user?.id}
        onDelete={(postId: string) => {
          deletePost.mutate(postId);
        }}
        onEdit={() => {
          setEditModalOpen(true);
        }}
      />

      {post.title && (
        <div className="px-5 mt-2 mb-3">
          <h2 className="text-xl font-semibold text-gray-900">{post.title}</h2>
        </div>
      )}

      {post.content && <PostText text={post.content} />}

      {/* Poll UI */}
      {post.postType === "poll" && post.pollOptions && (
        <PostPoll
          postId={post.id}
          options={post.pollOptions}
          votes={post.pollVotes}
          endsAt={post.pollEndsAt}
          currentUserId={user?.id}
        />
      )}

      {/* Media Grid */}
      {containsVideosOrImages && (
        <PostMediaGrid
          postInfo={{
            id: post.id,
            username: post.username,
            profilePic: post.profilePic,
            createdAt: post.createdAt,
          }}
          media={videosAndImages}
          title={post.title ? post.title : null}
          content={post.content}
          isLoading={isLoading}
          onClick={(index) => openPostModal(post.id, index)}
        />
      )}

      {/* File Attachments */}
      {attachments && attachments.length > 0 && (
        <PostAttachments
          media={attachments}
          addMargin={containsVideosOrImages ? true : false}
        />
      )}

      {/* Link Embeds - NEW */}
      {post.links && post.links.length > 0 && (
        <LinkEmbedPreview links={post.links} editable={false} />
      )}

      {/* Likes, comments and share counts */}
      <div className="px-4 py-2">
        <div className="flex flex-row justify-end">
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {post.likeCount} likes
          </span>
          <span
            onClick={() => openPostModal(post.id, 0)}
            className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
          >
            {numOfCommentsContent(post)}
          </span>
          <span className="text-sm text-gray-500 mr-3 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2">
            {post.shareCount || 0} shares
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-evenly py-4 border-t border-gray-200">
        <button
          className={`flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
            post.isLiked ? "text-red-600" : "text-gray-600 hover:text-red-600"
          }`}
          disabled={toggleLike.isPending}
          onClick={() =>
            toggleLike.mutate({
              postId: post.id,
              isLiked: post.isLiked ?? false,
            })
          }
        >
          <ThumbsUp
            className={`w-5 h-5 ${post.isLiked ? "fill-red-600" : ""}`}
          />
          <span>{post.isLiked ? "Liked" : "Like"}</span>
        </button>
        <button
          onClick={() => openPostModal(post.id, 0)}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button
          onClick={() => setShareModalOpen(true)}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={`${window.location.origin}${POST_DETAIL_PAGE_PATH(post.id, 0, "share")}`}
      />

      {/* Edit Post Modal */}
      {editModalOpen && (
        <CreatePostModal
          user={user || { id: "", username: "unknown", slug: "slug" }}
          isOpen={editModalOpen}
          setIsOpen={setEditModalOpen}
          editMode={true}
          exisistingPost={post}
        />
      )}
    </div>
  );
}
