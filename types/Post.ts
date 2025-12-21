type PostType = {
  // ---------- core ----------
  id: string | number; // mock uses number, DB uses string (ObjectId)

  // ---------- mock fields ----------
  author?: string;
  education?: string;
  avatar?: string;
  timestamp?: string;
  image?: string;

  // ---------- real post fields ----------
  userId?: string;
  username?: string;
  profilePic?: string | null;

  postType?: string;
  visibility?: string | null;

  title?: string | null;
  content?: string;

  media?: {
    blobName: string;
    url: string;
    type: string;
    name?: string;
    mimeType?: string;
    size?: number;
  }[] | null;

  likeCount?: number;
  commentCount?: number;

  createdAt?: string | Date;
  updatedAt?: string | Date;

};

export default PostType;