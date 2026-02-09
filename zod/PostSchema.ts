import { z } from "zod";

import { MediaSchema } from "./MediaSchema";

const LinkEmbedSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  image: z.string().url().optional(),
  siteName: z.string().optional(),
  favicon: z.string().url().optional(),
});

export const CreatePostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "opportunity"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  commentsDisabled: z.boolean(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(), // duration in days
  media: z.array(MediaSchema).optional(),
});

export const EditPostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "opportunity"]),
  title: z.string().optional(),
  content: z.string().optional(),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(),
});
