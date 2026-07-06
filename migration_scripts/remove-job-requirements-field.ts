import "dotenv/config";

import prisma from "../lib/prisma";

const JOB_POST_COLLECTION = "JobPost";

type CountCommandResult = {
  n?: number;
};

type UpdateCommandResult = {
  n?: number;
  nModified?: number;
};

async function countJobPostsWithLegacyRequirements() {
  const result = (await prisma.$runCommandRaw({
    count: JOB_POST_COLLECTION,
    query: {
      jobRequirements: {
        $exists: true,
      },
    },
  })) as CountCommandResult;

  return result.n ?? 0;
}

async function removeLegacyJobRequirementsField() {
  return (await prisma.$runCommandRaw({
    update: JOB_POST_COLLECTION,
    updates: [
      {
        q: {
          jobRequirements: {
            $exists: true,
          },
        },
        u: {
          $unset: {
            jobRequirements: "",
          },
        },
        multi: true,
      },
    ],
  })) as UpdateCommandResult;
}

async function main() {
  const beforeCount = await countJobPostsWithLegacyRequirements();

  if (beforeCount === 0) {
    console.info("No JobPost documents have the legacy jobRequirements field.");
    return;
  }

  const result = await removeLegacyJobRequirementsField();
  const afterCount = await countJobPostsWithLegacyRequirements();

  console.info(
    `Removed legacy jobRequirements from ${result.nModified ?? 0} of ${result.n ?? beforeCount} matched JobPost documents.`,
  );
  console.info(`${afterCount} JobPost documents still have jobRequirements.`);
}

main()
  .catch((error) => {
    console.error("Failed to remove legacy jobRequirements field:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
