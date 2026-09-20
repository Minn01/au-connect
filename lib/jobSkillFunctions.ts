import { Prisma } from "@/lib/generated/prisma";

type JobSkillWithSkill = {
  skill: { id?: string; name: string };
};

export class SkillValidationError extends Error {
  status = 400;
}

export function normalizeSkillNames(values: unknown) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  return values.flatMap((value) => {
    if (typeof value !== "string") return [];
    const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!name || seen.has(key)) return [];
    seen.add(key);
    return [name];
  });
}

export function getSkillNamesFromJobSkills(jobSkills?: JobSkillWithSkill[]) {
  return (jobSkills ?? []).map(({ skill }) => skill.name);
}

export function getSkillOptionsFromJobSkills(jobSkills?: JobSkillWithSkill[]) {
  return (jobSkills ?? []).flatMap(({ skill }) =>
    skill.id ? [{ id: skill.id, name: skill.name }] : [],
  );
}

export async function syncJobSkills(
  tx: Prisma.TransactionClient,
  jobPostId: string,
  skillIds: string[],
) {
  if (new Set(skillIds).size !== skillIds.length) {
    throw new SkillValidationError("Duplicate skill IDs are not allowed");
  }
  const skills = await tx.skill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true },
  });
  if (skills.length !== skillIds.length) {
    throw new SkillValidationError("One or more skills do not exist");
  }

  await tx.jobSkill.deleteMany({ where: { jobPostId } });
  for (const skillId of skillIds) {
    await tx.jobSkill.create({ data: { jobPostId, skillId } });
  }
}
