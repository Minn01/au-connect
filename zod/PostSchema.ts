import { z } from "zod";
export const CreatePostSchema = z.object({
  postType: z.enum(["discussion", "media", "article"]),
  visibility: z.enum(["everyone", "friends", "me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  media: z.any().optional(),
});
