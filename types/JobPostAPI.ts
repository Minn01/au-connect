// types/JobPostAPI.ts

import { ApplicationStatus } from "@/lib/generated/prisma";

export type JobPostAPI = {
  id: string;
  jobTitle: string;
  companyName?: string | null;
  location?: string | null;
  locationType?: string | null;
  employmentType: string;

  positionsAvailable: number;

  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;

  deadline?: Date | null;

  jobDetails?: string | null;
  jobRequirements?: string[] | null;

  applyUrl?: string | null;
  allowExternalApply: boolean;

  // computed fields
  positionsFilled: number;
  remainingPositions: number;
  hasApplied: boolean;
  applicationStatus: ApplicationStatus | null;
};