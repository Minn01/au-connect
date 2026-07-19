import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

export const CreateReportSchema = z.object({
  targetType: z.enum(["POST", "USER"]),
  targetId: objectId,
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "HATE_SPEECH",
    "VIOLENCE",
    "NUDITY",
    "SCAM",
    "MISINFORMATION",
    "FAKE_ACCOUNT",
    "IMPERSONATION",
    "OTHER",
  ]),
  description: z.string().trim().min(1).max(5_000).optional(),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
