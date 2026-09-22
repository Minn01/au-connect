import { ThumbsUp, MessageCircle, Send } from "lucide-react";
import PostType from "@/types/Post";

export default function PostInteractionSection({
  post,
  commentCount,
  likePending,
  onLikeClicked,
  onCommentClicked,
  onShareClicked,
}: {
  post: PostType;
  commentCount: string;
  likePending: boolean;
  onLikeClicked: () => void;
  onCommentClicked: () => void;
  onShareClicked: () => void;
}) {
  return (
    <>
      {/* Likes, comments and share counts */}
      <div className="px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-1">
          <span className="text-xs text-gray-500 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2 sm:text-sm">
            {post.likeCount} likes
          </span>
          <span
            onClick={onCommentClicked}
            className="text-xs text-gray-500 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2 sm:text-sm"
          >
            {commentCount}
          </span>
          <span className="text-xs text-gray-500 cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2 sm:text-sm">
            {post.shareCount || 0} shares
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 items-center border-t border-gray-200 py-3 text-sm sm:flex sm:justify-evenly sm:py-4 sm:text-base">
        <button
          className={`flex min-w-0 items-center justify-center gap-1.5 disabled:opacity-50 sm:gap-2 ${
            post.isLiked ? "text-red-600" : "text-gray-600 hover:text-red-600"
          }`}
          disabled={likePending}
          onClick={onLikeClicked}
        >
          <ThumbsUp
            className={`w-5 h-5 ${post.isLiked ? "fill-red-600" : ""}`}
          />
          <span>{post.isLiked ? "Liked" : "Like"}</span>
        </button>
        <button
          onClick={onCommentClicked}
          className="flex min-w-0 items-center justify-center gap-1.5 text-gray-600 hover:text-red-600 sm:gap-2"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button
          onClick={onShareClicked}
          className="flex min-w-0 items-center justify-center gap-1.5 text-gray-600 hover:text-red-600 sm:gap-2"
        >
          <Send className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>
    </>
  );
}
