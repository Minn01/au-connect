import { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";

import CommentInput from "./CommentInput";
import parseDate from "../profile/utils/parseDate";
import { useReplies } from "../profile/utils/fetchfunctions";

//TODO:moveto-type
export type CommentType = {
  id: string;
  username: string;
  profilePic: string;
  content: string;
  createdAt: string;
  replyCount?: number;
  replies?: CommentType[];
};


export default function CommentItem({
  comment,
  postId,
  createCommentMutation,
  depth = 0,
}: {
  comment: CommentType;
  postId: string;
  createCommentMutation: UseMutationResult<
    CommentType,
    Error,
    {
      postId: string;
      content: string;
      parentId?: string;
    },
    unknown
  >;
  depth?: number;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useReplies(postId, comment.id);

  const replies =
    data?.pages.flatMap((page) => page.replies) ?? [];

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex gap-3">
        <img
          src={comment.profilePic}
          className="w-8 h-8 rounded-full"
          alt=""
        />

        <div className="text-sm text-gray-900 w-full">
          <span className="font-semibold mr-1">{comment.username}</span>
          {comment.content}

          <div className="flex gap-3 text-xs text-gray-500 mt-1">
            <span>{parseDate(comment.createdAt)}</span>

            {comment.replyCount && comment.replyCount > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="hover:text-blue-500"
              >
                {showReplies
                  ? "Hide replies"
                  : `View replies (${comment.replyCount})`}
              </button>
            )}

            <button
              onClick={() => setIsReplying((v) => !v)}
              className="hover:text-blue-500"
            >
              Reply
            </button>
          </div>
        </div>
      </div>

      {/* Reply input */}
      {isReplying && (
        <div className="mt-2 ml-11">
          <CommentInput
            placeholder={`Reply to ${comment.username}...`}
            onSubmit={(text) => {
              createCommentMutation.mutate({
                postId,
                content: text,
                parentId: comment.id,
              });
              setIsReplying(false);
            }}
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="mt-3 space-y-3">
          {isLoading && (
            <div className="text-xs text-gray-500 ml-11">
              Loading replies...
            </div>
          )}

          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              createCommentMutation={createCommentMutation}
              depth={depth + 1}
            />
          ))}

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="ml-11 text-xs text-blue-500 hover:underline"
            >
              {isFetchingNextPage
                ? "Loading..."
                : "Show more replies"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
