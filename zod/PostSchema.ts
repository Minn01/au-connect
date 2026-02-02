import { z } from "zod";

import { MediaSchema } from "./MediaSchema";

export const CreatePostSchema = z.object({
  postType: z.enum(["discussion", "media", "article"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),
});

export const EditPostSchema = z.object({
  postType: z.enum(["discussion", "media", "article"]).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),
});
