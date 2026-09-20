export type HydrationJob = {
  id: string;
  jobTitle: string;
  companyName: string | null;
  location: string | null;
  locationType: string | null;
  employmentType: string;
  status: string;
  positionsAvailable: number;
  positionsFilled: number;
  deadline: Date | null;
  createdAt: Date;
  jobSkills: Array<{ skill: { id: string; name: string } }>;
  applications: Array<{ id: string }>;
  post: {
    id: string;
    userId: string;
    actorType: "USER" | "COMMUNITY";
    visibility: string | null;
    moderationStatus: string;
    removedAt: Date | null;
    community: { status: string } | null;
  };
};

export function hydrateRecommendedJobs({
  candidateIds,
  jobs,
  userId,
  profileSkillIds,
  profileLocation,
  connectedIds,
  limit,
  now = Date.now(),
}: {
  candidateIds: string[];
  jobs: HydrationJob[];
  userId: string;
  profileSkillIds: Set<string>;
  profileLocation: string | null;
  connectedIds: Set<string>;
  limit: number;
  now?: number;
}) {
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const emitted = new Set<string>();
  return candidateIds.flatMap((id) => {
    if (emitted.has(id)) return [];
    const job = byId.get(id);
    if (
      !job ||
      job.status !== "OPEN" ||
      job.positionsFilled >= job.positionsAvailable ||
      job.applications.length > 0 ||
      job.post.moderationStatus !== "VISIBLE" ||
      job.post.removedAt
    ) return [];
    if (job.deadline && job.deadline.getTime() < now) return [];
    if (job.post.actorType === "COMMUNITY" && job.post.community?.status !== "ACTIVE") return [];
    const visibility = job.post.visibility ?? "everyone";
    const isOwner = job.post.userId === userId;
    if (visibility === "only-me" && !isOwner) return [];
    if (visibility === "friends" && !isOwner && !connectedIds.has(job.post.userId)) return [];

    const matchedSkills = job.jobSkills.filter(({ skill }) =>
      profileSkillIds.has(skill.id),
    ).length;
    const sameLocation =
      !!profileLocation &&
      !!job.location &&
      profileLocation.trim().toLowerCase() === job.location.trim().toLowerCase();
    const recent = now - job.createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
    emitted.add(id);

    return [{
      id: job.id,
      postId: job.post.id,
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      location: job.location,
      locationType: job.locationType,
      employmentType: job.employmentType,
      deadline: job.deadline,
      skills: job.jobSkills.map(({ skill }) => skill),
      explanation: matchedSkills
        ? `Matches ${matchedSkills} of your skills`
        : sameLocation
          ? "Matches your location"
          : recent
            ? "Recently posted"
            : "Based on your profile",
    }];
  }).slice(0, limit);
}
