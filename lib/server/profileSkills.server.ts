import "server-only";

import { MAX_PROFILE_SKILLS } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { requestUserEmbeddingRefresh } from "@/lib/server/userEmbeddingRefresh.server";

const OBJECT_ID = /^[a-f\d]{24}$/i;

export class ProfileSkillError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function validateProfileSkillIds(value: unknown) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) {
    throw new ProfileSkillError("skillIds must be an array of skill IDs");
  }
  if (value.length > MAX_PROFILE_SKILLS) {
    throw new ProfileSkillError(
      `A profile can have at most ${MAX_PROFILE_SKILLS} skills`,
    );
  }
  if (value.some((id) => !OBJECT_ID.test(id))) {
    throw new ProfileSkillError("One or more skill IDs are invalid");
  }
  if (new Set(value).size !== value.length) {
    throw new ProfileSkillError("Duplicate skill IDs are not allowed");
  }
  return value as string[];
}

type ProfileSkillDb = {
  skill: {
    findMany(args: unknown): Promise<Array<{ id: string; name: string }>>;
  };
  userSkill: {
    findUnique(args: unknown): Promise<{ id: string } | null>;
    delete(args: unknown): Promise<unknown>;
  };
  $transaction<T>(callback: (tx: {
    userSkill: {
      deleteMany(args: unknown): Promise<unknown>;
      create(args: unknown): Promise<unknown>;
    };
  }) => Promise<T>): Promise<T>;
};

export async function replaceProfileSkills(
  userId: string,
  value: unknown,
  db: ProfileSkillDb = prisma as unknown as ProfileSkillDb,
  refresh: (id: string) => Promise<unknown> = requestUserEmbeddingRefresh,
) {
  const skillIds = validateProfileSkillIds(value);
  const skills = await db.skill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true, name: true },
  });
  if (skills.length !== skillIds.length) {
    throw new ProfileSkillError("One or more skills do not exist", 404);
  }
  await db.$transaction(async (tx) => {
    await tx.userSkill.deleteMany({ where: { userId } });
    for (const [order, skillId] of skillIds.entries()) {
      await tx.userSkill.create({ data: { userId, skillId, order } });
    }
  });
  await refresh(userId);
  const byId = new Map(skills.map((skill) => [skill.id, skill]));
  return skillIds.map((id) => byId.get(id)!);
}

export async function removeProfileSkill(
  userId: string,
  skillId: string,
  db: ProfileSkillDb = prisma as unknown as ProfileSkillDb,
  refresh: (id: string) => Promise<unknown> = requestUserEmbeddingRefresh,
) {
  if (!OBJECT_ID.test(skillId)) throw new ProfileSkillError("Invalid skill ID");
  const relation = await db.userSkill.findUnique({
    where: { userId_skillId: { userId, skillId } },
    select: { id: true },
  });
  if (!relation) throw new ProfileSkillError("Profile skill not found", 404);
  await db.userSkill.delete({ where: { id: relation.id } });
  await refresh(userId);
}
