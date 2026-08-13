import { z } from "zod";

import { MediaSchema } from "./MediaSchema";
import JobSchema from "./JobSchema";

const optionalString = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalUrl = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().url().optional());

const LinkEmbedSchema = z.object({
  url: z.string().trim().url("Must be a valid URL"),
  title: z.string().trim().min(1, "Title is required"),
  description: optionalString,
  image: optionalUrl,
  siteName: optionalString,
  favicon: optionalUrl,
  jobDetails: optionalString,
  jobSkills: z.array(z.string()).optional(),
  jobRequirements: z.array(z.string()).optional(),
});

export const CreatePostSchema = z.object({
  actorType: z.enum(["USER", "COMMUNITY"]).default("USER"),
  communityId: z.string().optional().nullable(),
  postType: z.enum(["media", "article", "poll", "job_post"]),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  title: z.string().optional(),
  content: z.string(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(), // duration in days

  // job_post related specific fields
  job: JobSchema.optional(),
});

export const EditPostSchema = z.object({
  postType: z.enum(["media", "article", "poll", "job_post"]),
  title: z.string().optional(),
  content: z.string().optional(),
  visibility: z.enum(["everyone", "friends", "only-me"]).optional(),
  commentsDisabled: z.boolean(),
  media: z.array(MediaSchema).optional(),

  // Link-specific fields
  links: z.array(LinkEmbedSchema).optional(),

  // Poll-specific fields
  pollOptions: z.array(z.string()).optional(),
  pollDuration: z.number().optional(),

  // job_post related specific fields
  job: JobSchema.optional(),
});
