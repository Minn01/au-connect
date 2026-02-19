// types/PostAPI.ts

import { JobPostAPI } from "./JobPostAPI";
import { PostMediaSafe } from "./PostMediaSafe";

export type PostAPI = {
  id: string;

  username: string;
  profilePic?: string | null;

  media?: PostMediaSafe[] | null;

  isLiked: boolean;
  isSaved: boolean;

  numOfComments: number;

  jobPost?: JobPostAPI | null;

  createdAt: Date;
};