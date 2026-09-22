import { z } from "zod";

const JobSchema = z
  .object({
    jobTitle: z.string().min(1),
    companyName: z.string().optional(),
    location: z.string().optional(),
    locationType: z.enum(["ONSITE", "REMOTE", "HYBRID"]).optional(),
    employmentType: z.enum([
      "FULL_TIME",
      "PART_TIME",
      "FREELANCE",
      "INTERNSHIP",
    ]),
    positionsAvailable: z.number().min(1).optional(),
    status: z.enum(["OPEN", "CLOSED", "FILLED"]).optional(),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryCurrency: z.string().optional(),
    deadline: z.string().optional(),
    jobDetails: z.string().optional(),
    skillIds: z
      .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid skill ID"))
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Duplicate skill IDs are not allowed",
      })
      .optional(),
    jobRequirements: z.array(z.string()).optional(),
    allowExternalApply: z.boolean(),
    applyUrl: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.allowExternalApply ||
      (data.applyUrl && /^https?:\/\/.+/.test(data.applyUrl)),
    {
      message: "Valid apply URL required when external apply is enabled",
      path: ["applyUrl"],
    },
  );

export default JobSchema;
