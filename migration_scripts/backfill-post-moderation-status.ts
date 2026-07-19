import "dotenv/config";

import prisma from "../lib/prisma";

const POST_COLLECTION = "Post";

type CountCommandResult = {
  n?: number;
};

type UpdateCommandResult = {
  n?: number;
  nModified?: number;
};

async function countPostsMissingModerationStatus() {
  const result = (await prisma.$runCommandRaw({
    count: POST_COLLECTION,
    query: {
      moderationStatus: {
        $exists: false,
      },
    },
  })) as CountCommandResult;

  return result.n ?? 0;
}

async function backfillModerationStatus() {
  return (await prisma.$runCommandRaw({
    update: POST_COLLECTION,
    updates: [
      {
        q: {
          moderationStatus: {
            $exists: false,
          },
        },
        u: {
          $set: {
            moderationStatus: "VISIBLE",
          },
        },
        multi: true,
      },
    ],
  })) as UpdateCommandResult;
}

async function main() {
  const beforeCount = await countPostsMissingModerationStatus();

  if (beforeCount === 0) {
    console.info("Every Post document already has moderationStatus.");
    return;
  }

  const result = await backfillModerationStatus();
  const afterCount = await countPostsMissingModerationStatus();

  console.info(
    `Set moderationStatus to VISIBLE on ${result.nModified ?? 0} of ${result.n ?? beforeCount} matched Post documents.`,
  );
  console.info(`${afterCount} Post documents are still missing moderationStatus.`);
}

main()
  .catch((error) => {
    console.error("Failed to backfill Post moderationStatus:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
