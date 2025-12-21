import User from "@/types/User";
import PostType from "@/types/Post";
import AC_Event from '@/types/AC_Event'

export type LeftProfilePropTypes = {
  user: User | null
  loading: boolean
};

export type MainFeedPropTypes = {
  user: User 
  posts: Array<PostType>
  loading: boolean
  onPostCreated: (post: PostType) => void
};

export type RightEventsProfileTypes = {
  events: Array<AC_Event>
  loading: boolean
};
