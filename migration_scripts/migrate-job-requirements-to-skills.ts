import "dotenv/config";

import prisma from "../lib/prisma";

type LegacyJobPost = {
  _id: string | { $oid: string };
  jobRequirements?: unknown;
};

type MongoCursorBatch = {
  cursor?: {
    id?: number | string | { $numberLong: string };
    ns?: string;
    firstBatch?: LegacyJobPost[];
    nextBatch?: LegacyJobPost[];
  };
};

type MongoCursorId = NonNullable<MongoCursorBatch["cursor"]>["id"];

const JOB_POST_COLLECTION = "JobPost";
const BATCH_SIZE = 100;

function objectIdToString(id: LegacyJobPost["_id"]) {
  return typeof id === "string" ? id : id.$oid;
}

function normalizeSkillName(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function uniqueSkillNames(jobRequirements: unknown) {
  if (!Array.isArray(jobRequirements)) return [];

  const seen = new Set<string>();
  const names: string[] = [];

  for (const requirement of jobRequirements) {
    const name = normalizeSkillName(requirement);
    if (!name) continue;

    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    names.push(name);
  }

  return names;
}

function cursorIsOpen(cursorId: MongoCursorId) {
  if (cursorId === undefined || cursorId === null) return false;
  if (typeof cursorId === "object") return cursorId.$numberLong !== "0";

  return cursorId !== 0 && cursorId !== "0";
}

async function fetchLegacyJobPosts() {
  const jobPosts: LegacyJobPost[] = [];

  const initial = (await prisma.$runCommandRaw({
    find: JOB_POST_COLLECTION,
    filter: {
      jobRequirements: {
        $exists: true,
        $type: "array",
        $ne: [],
      },
    },
    projection: {
      _id: 1,
      jobRequirements: 1,
    },
    batchSize: BATCH_SIZE,
  })) as MongoCursorBatch;

  const cursor = initial.cursor;
  jobPosts.push(...(cursor?.firstBatch ?? []));

  let cursorId = cursor?.id;
  while (cursorIsOpen(cursorId)) {
    const next = (await prisma.$runCommandRaw({
      getMore: cursorId,
      collection: JOB_POST_COLLECTION,
      batchSize: BATCH_SIZE,
    })) as MongoCursorBatch;

    jobPosts.push(...(next.cursor?.nextBatch ?? []));
    cursorId = next.cursor?.id;
  }

  return jobPosts;
}

async function main() {
  const legacyJobPosts = await fetchLegacyJobPosts();

  let migratedJobPosts = 0;
  let skippedJobPosts = 0;
  let linkedSkills = 0;

  for (const jobPost of legacyJobPosts) {
    const jobPostId = objectIdToString(jobPost._id);
    const existingJobPost = await prisma.jobPost.findUnique({
      where: { id: jobPostId },
      select: { id: true },
    });

    if (!existingJobPost) {
      skippedJobPosts += 1;
      continue;
    }

    const skillNames = uniqueSkillNames(jobPost.jobRequirements);

    if (skillNames.length === 0) {
      skippedJobPosts += 1;
      continue;
    }

    for (const name of skillNames) {
      const skill = await prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
      });

      await prisma.jobSkill.upsert({
        where: {
          jobPostId_skillId: {
            jobPostId,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          jobPostId,
          skillId: skill.id,
        },
      });

      linkedSkills += 1;
    }

    migratedJobPosts += 1;
  }

  console.info(
    `Migrated ${migratedJobPosts} job posts, skipped ${skippedJobPosts}, linked ${linkedSkills} skills.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to migrate job requirements to skills:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
