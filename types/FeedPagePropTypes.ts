import User from "@/types/User";
import PostType from "@/types/Post";
import AC_Event from '@/types/AC_Event'

export interface LeftProfilePropTypes {
  user: {
    name: string;
    title: string;
    education: string;
    location: string;
    avatar: string;
    slug: string;     // ADD
  };
  loading: boolean;
}


export type MainFeedPropTypes = {
  user: User
  posts: Array<PostType>
  loading: boolean
};

export type RightEventsProfileTypes = {
  events: Array<AC_Event>
  loading: boolean
};
