type CommentType = {
  id: string;
  userId?: string;
  actorType?: "USER" | "COMMUNITY";
  communityId?: string | null;
  community?: {
    id: string;
    name: string;
    slug: string;
    profilePic?: string | null;
  } | null;
  username: string;
  profilePic: string;
  content: string;
  createdAt: string;
  replyCount?: number;
  replies?: CommentType[];
};

export default CommentType;

