import { z } from "zod";

import MediaSchema from "./MediaSchema";

export const CreatePostSchema = z.object({
  postType: z.enum(["discussion", "media", "article"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  media: z.array(MediaSchema).optional(),
});
