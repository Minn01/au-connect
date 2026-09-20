import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  ROOT,
  SkillInputError,
  client,
  databaseUrl,
  safeError,
} from "./lib/skill-tools";

export const RESET_SCRIPT_VERSION = "1.0.0";
export const CONFIRMATION_FLAG = "--confirm-reset-skills";

type Counts = {
  users: number;
  jobs: number;
  skills: number;
  userSkills: number;
  jobSkills: number;
};

type BatchResult = { count: number };

export type SkillResetDb = {
  user: { count(): Promise<number> };
  jobPost: { count(): Promise<number> };
  skill: {
    count(): Promise<number>;
    findMany(): Promise<unknown[]>;
    deleteMany(): Promise<BatchResult>;
  };
  userSkill: {
    count(): Promise<number>;
    findMany(): Promise<unknown[]>;
    deleteMany(): Promise<BatchResult>;
  };
  jobSkill: {
    count(): Promise<number>;
    findMany(): Promise<unknown[]>;
    deleteMany(): Promise<BatchResult>;
  };
};

type BackupSnapshot = {
  skills: unknown[];
  userSkills: unknown[];
  jobSkills: unknown[];
};

type BackupWriter = (
  snapshot: BackupSnapshot,
  metadata: {
    timestamp: string;
    counts: Counts;
    databaseName: string;
    scriptVersion: string;
  },
) => Promise<string>;

export function parseResetArguments(args = process.argv.slice(2)) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--dry-run")) {
    return { dryRun: true as const };
  }
  if (args.length === 1 && args[0] === CONFIRMATION_FLAG) {
    return { dryRun: false as const };
  }
  throw new SkillInputError(
    `Unknown arguments. Use --dry-run or the exact ${CONFIRMATION_FLAG} flag.`,
  );
}

export function sanitizedDatabaseTarget(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SkillInputError("DATABASE_URL is not a valid URL.");
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (!parsed.hostname || !databaseName) {
    throw new SkillInputError(
      "DATABASE_URL must include a database host and database name.",
    );
  }
  return { databaseHost: parsed.hostname, databaseName };
}

async function counts(db: SkillResetDb): Promise<Counts> {
  const [users, jobs, skills, userSkills, jobSkills] = await Promise.all([
    db.user.count(),
    db.jobPost.count(),
    db.skill.count(),
    db.userSkill.count(),
    db.jobSkill.count(),
  ]);
  return { users, jobs, skills, userSkills, jobSkills };
}

export function backupWriter({
  root = ROOT,
  now = () => new Date(),
}: {
  root?: string;
  now?: () => Date;
} = {}): BackupWriter {
  return async (snapshot, metadata) => {
    const directoryName = `skill-reset-${now()
      .toISOString()
      .replace(/[:.]/g, "-")}`;
    const backupsRoot = resolve(root, "data/backups");
    const finalPath = resolve(backupsRoot, directoryName);
    const temporaryPath = resolve(
      backupsRoot,
      `.${directoryName}.tmp-${process.pid}`,
    );
    try {
      await mkdir(backupsRoot, { recursive: true });
      await mkdir(temporaryPath);
      await Promise.all([
        writeFile(
          resolve(temporaryPath, "skills.json"),
          JSON.stringify(snapshot.skills, null, 2) + "\n",
          { flag: "wx" },
        ),
        writeFile(
          resolve(temporaryPath, "user-skills.json"),
          JSON.stringify(snapshot.userSkills, null, 2) + "\n",
          { flag: "wx" },
        ),
        writeFile(
          resolve(temporaryPath, "job-skills.json"),
          JSON.stringify(snapshot.jobSkills, null, 2) + "\n",
          { flag: "wx" },
        ),
        writeFile(
          resolve(temporaryPath, "metadata.json"),
          JSON.stringify(metadata, null, 2) + "\n",
          { flag: "wx" },
        ),
      ]);
      await rename(temporaryPath, finalPath);
      return `data/backups/${directoryName}`;
    } catch (error) {
      await rm(temporaryPath, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
  };
}

export async function resetSkillData(
  db: SkillResetDb,
  {
    dryRun,
    databaseHost,
    databaseName,
    writeBackup = backupWriter(),
    timestamp = new Date().toISOString(),
  }: {
    dryRun: boolean;
    databaseHost: string;
    databaseName: string;
    writeBackup?: BackupWriter;
    timestamp?: string;
  },
) {
  const before = await counts(db);
  console.info(
    JSON.stringify(
      {
        phase: "preflight",
        dryRun,
        databaseHost,
        databaseName,
        users: before.users,
        jobs: before.jobs,
        skills: before.skills,
        userSkills: before.userSkills,
        jobSkills: before.jobSkills,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    const summary = {
      dryRun: true as const,
      wouldDelete: {
        skills: before.skills,
        userSkills: before.userSkills,
        jobSkills: before.jobSkills,
      },
      usersUnchanged: before.users,
      jobsUnchanged: before.jobs,
      backupPath: null,
    };
    console.info(JSON.stringify(summary, null, 2));
    return summary;
  }

  const snapshot: BackupSnapshot = {
    skills: await db.skill.findMany(),
    userSkills: await db.userSkill.findMany(),
    jobSkills: await db.jobSkill.findMany(),
  };
  if (
    snapshot.skills.length !== before.skills ||
    snapshot.userSkills.length !== before.userSkills ||
    snapshot.jobSkills.length !== before.jobSkills
  ) {
    throw new SkillInputError(
      "Skill data changed while the backup was being prepared; no records were deleted.",
    );
  }

  const backupPath = await writeBackup(snapshot, {
    timestamp,
    counts: before,
    databaseName,
    scriptVersion: RESET_SCRIPT_VERSION,
  });

  // Relationship records must be removed before the shared catalogue.
  const userSkillsDeleted = (await db.userSkill.deleteMany()).count;
  const jobSkillsDeleted = (await db.jobSkill.deleteMany()).count;
  const skillsDeleted = (await db.skill.deleteMany()).count;

  const after = await counts(db);
  const skillCollectionsEmpty =
    after.skills === 0 && after.userSkills === 0 && after.jobSkills === 0;
  const coreCountsUnchanged =
    after.users === before.users && after.jobs === before.jobs;
  const summary = {
    dryRun: false as const,
    skillsDeleted,
    userSkillsDeleted,
    jobSkillsDeleted,
    usersBefore: before.users,
    usersAfter: after.users,
    jobsBefore: before.jobs,
    jobsAfter: after.jobs,
    skillsAfter: after.skills,
    userSkillsAfter: after.userSkills,
    jobSkillsAfter: after.jobSkills,
    backupPath,
    verified: skillCollectionsEmpty && coreCountsUnchanged,
  };
  console.info(JSON.stringify(summary, null, 2));

  if (!coreCountsUnchanged) {
    throw new SkillInputError(
      `CRITICAL: User or JobPost counts changed: ${JSON.stringify(summary)}`,
    );
  }
  if (!skillCollectionsEmpty) {
    throw new SkillInputError(
      `Skill reset is incomplete; remaining counts: ${JSON.stringify({
        skills: after.skills,
        userSkills: after.userSkills,
        jobSkills: after.jobSkills,
      })}`,
    );
  }
  return summary;
}

export async function main() {
  const { dryRun } = parseResetArguments();
  const url = databaseUrl();
  const target = sanitizedDatabaseTarget(url);
  const db = client();
  try {
    await resetSkillData(db as unknown as SkillResetDb, {
      dryRun,
      ...target,
    });
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(safeError(error));
    process.exitCode = 1;
  });
}
