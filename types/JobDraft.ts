type JobDraft = {
  id?: string;
  jobTitle: string;
  companyName?: string | null;
  location?: string | null;
  locationType?: "ONSITE" | "REMOTE" | "HYBRID" | "" | null;
  employmentType: "FULL_TIME" | "PART_TIME" | "FREELANCE" | "INTERNSHIP" | "";
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  status: "OPEN" | "CLOSED" | "FILLED";
  positionsAvailable?: number;
deadline?: string;
  jobDetails?: string | null;
  jobRequirements?: string[];
  allowExternalApply: boolean;
  applyUrl?: string | null;

  // application status
  hasApplied?: boolean;
  applicationStatus?: "APPLIED" | "SHORTLISTED" | "REJECTED" | null;
  positionsFilled?: number;
  remainingPositions?: number;
};

export default JobDraft;
