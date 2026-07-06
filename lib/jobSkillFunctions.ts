import { Prisma } from "@/lib/generated/prisma";

type JobSkillWithName = {
  skill: {
    name: string;
  };
};

export function normalizeSkillNames(values: unknown) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") continue;

    const name = value.trim().replace(/\s+/g, " ");
    if (!name) continue;

    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(name);
  }

  return names;
}

export function getSkillNamesFromJobSkills(jobSkills?: JobSkillWithName[]) {
  return (jobSkills ?? []).map((jobSkill) => jobSkill.skill.name);
}

export async function syncJobSkills(
  tx: Prisma.TransactionClient,
  jobPostId: string,
  skillNames: string[],
) {
  await tx.jobSkill.deleteMany({
    where: { jobPostId },
  });

  for (const name of skillNames) {
    const skill = await tx.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await tx.jobSkill.create({
      data: {
        jobPostId,
        skillId: skill.id,
      },
    });
  }
}
