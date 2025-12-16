import { z } from "zod";

const MediaSchema = z.object({
  blobName: z.string(),
  type: z.enum(["image", "video", "file"]),
  name: z.string(),
  mimetype: z.string().optional(),
  size: z.number().optional(),
});

export default MediaSchema;
