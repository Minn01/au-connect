import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CONFIRMATION_FLAG,
  RESET_SCRIPT_VERSION,
  backupWriter,
  parseResetArguments,
  resetSkillData,
  sanitizedDatabaseTarget,
  type SkillResetDb,
} from "../scripts/reset-skill-data";

function memoryDb({
  users = 2,
  jobs = 3,
  skills = [{ id: "s1" }, { id: "s2" }],
  userSkills = [{ id: "us1", userId: "u1", skillId: "s1" }],
  jobSkills = [{ id: "js1", jobPostId: "j1", skillId: "s2" }],
} = {}) {
  const state = {
    users,
    jobs,
    skills: structuredClone(skills),
    userSkills: structuredClone(userSkills),
    jobSkills: structuredClone(jobSkills),
  };
  const writes: string[] = [];
  const collection = (key: "skills" | "userSkills" | "jobSkills") => ({
    async count() {
      return state[key].length;
    },
    async findMany() {
      return structuredClone(state[key]);
    },
    async deleteMany() {
      writes.push(key);
      const count = state[key].length;
      state[key] = [];
      return { count };
    },
  });
  const db: SkillResetDb = {
    user: { count: async () => state.users },
    jobPost: { count: async () => state.jobs },
    skill: collection("skills"),
    userSkill: collection("userSkills"),
    jobSkill: collection("jobSkills"),
  };
  return { db, state, writes };
}

const options = {
  databaseHost: "cluster.example.mongodb.net",
  databaseName: "au_connect",
};

test("argument parsing defaults to dry run, requires exact confirmation, and rejects unknown arguments", () => {
  assert.deepEqual(parseResetArguments([]), { dryRun: true });
  assert.deepEqual(parseResetArguments(["--dry-run"]), { dryRun: true });
  assert.deepEqual(parseResetArguments([CONFIRMATION_FLAG]), { dryRun: false });
  assert.throws(() => parseResetArguments(["--force"]), /Unknown arguments/);
  assert.throws(
    () => parseResetArguments([CONFIRMATION_FLAG, "--dry-run"]),
    /Unknown arguments/,
  );
  assert.deepEqual(
    sanitizedDatabaseTarget(
      "mongodb+srv://username:password@cluster.example.mongodb.net/au_connect",
    ),
    options,
  );
});

test("dry run reads counts without writes or a backup", async (t) => {
  t.mock.method(console, "info", () => {});
  const mock = memoryDb();
  let backups = 0;
  const before = structuredClone(mock.state);
  const result = await resetSkillData(mock.db, {
    dryRun: true,
    ...options,
    writeBackup: async () => {
      backups++;
      return "unexpected";
    },
  });
  assert.deepEqual(mock.state, before);
  assert.deepEqual(mock.writes, []);
  assert.equal(backups, 0);
  assert.equal(result.dryRun, true);
  if (!result.dryRun) assert.fail("Expected a dry-run summary");
  assert.deepEqual(result.wouldDelete, {
    skills: 2,
    userSkills: 1,
    jobSkills: 1,
  });
});

test("backup failure aborts before any deletion", async (t) => {
  t.mock.method(console, "info", () => {});
  const mock = memoryDb();
  const before = structuredClone(mock.state);
  await assert.rejects(
    resetSkillData(mock.db, {
      dryRun: false,
      ...options,
      writeBackup: async () => {
        throw new Error("disk full");
      },
    }),
    /disk full/,
  );
  assert.deepEqual(mock.state, before);
  assert.deepEqual(mock.writes, []);
});

test("confirmed reset deletes relationships first, preserves core counts, and is safely rerunnable", async (t) => {
  t.mock.method(console, "info", () => {});
  const mock = memoryDb();
  const backups: number[] = [];
  const first = await resetSkillData(mock.db, {
    dryRun: false,
    ...options,
    writeBackup: async (snapshot) => {
      backups.push(
        snapshot.skills.length +
          snapshot.userSkills.length +
          snapshot.jobSkills.length,
      );
      return "data/backups/first";
    },
  });
  assert.deepEqual(mock.writes, ["userSkills", "jobSkills", "skills"]);
  assert.deepEqual(mock.state, {
    users: 2,
    jobs: 3,
    skills: [],
    userSkills: [],
    jobSkills: [],
  });
  assert.equal(first.dryRun, false);
  if (first.dryRun) assert.fail("Expected a confirmed reset summary");
  assert.equal(first.verified, true);
  assert.deepEqual(
    {
      skillsDeleted: first.skillsDeleted,
      userSkillsDeleted: first.userSkillsDeleted,
      jobSkillsDeleted: first.jobSkillsDeleted,
      usersBefore: first.usersBefore,
      usersAfter: first.usersAfter,
      jobsBefore: first.jobsBefore,
      jobsAfter: first.jobsAfter,
    },
    {
      skillsDeleted: 2,
      userSkillsDeleted: 1,
      jobSkillsDeleted: 1,
      usersBefore: 2,
      usersAfter: 2,
      jobsBefore: 3,
      jobsAfter: 3,
    },
  );

  mock.writes.length = 0;
  const rerun = await resetSkillData(mock.db, {
    dryRun: false,
    ...options,
    writeBackup: async (snapshot) => {
      backups.push(
        snapshot.skills.length +
          snapshot.userSkills.length +
          snapshot.jobSkills.length,
      );
      return "data/backups/second";
    },
  });
  assert.equal(rerun.dryRun, false);
  if (rerun.dryRun) assert.fail("Expected a confirmed reset summary");
  assert.equal(rerun.verified, true);
  assert.equal(rerun.skillsDeleted, 0);
  assert.equal(rerun.userSkillsDeleted, 0);
  assert.equal(rerun.jobSkillsDeleted, 0);
  assert.deepEqual(mock.writes, ["userSkills", "jobSkills", "skills"]);
  assert.deepEqual(backups, [4, 0]);
});

test("backup writer creates all files and sanitized metadata", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "skill-reset-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const timestamp = "2026-09-20T01:02:03.456Z";
  const write = backupWriter({
    root,
    now: () => new Date(timestamp),
  });
  const counts = {
    users: 2,
    jobs: 3,
    skills: 1,
    userSkills: 1,
    jobSkills: 1,
  };
  const relativePath = await write(
    {
      skills: [{ id: "s1" }],
      userSkills: [{ id: "us1" }],
      jobSkills: [{ id: "js1" }],
    },
    {
      timestamp,
      counts,
      databaseName: "au_connect",
      scriptVersion: RESET_SCRIPT_VERSION,
    },
  );
  const absolutePath = join(root, relativePath);
  for (const filename of [
    "skills.json",
    "user-skills.json",
    "job-skills.json",
    "metadata.json",
  ]) {
    assert.equal(existsSync(join(absolutePath, filename)), true);
  }
  assert.deepEqual(JSON.parse(readFileSync(join(absolutePath, "metadata.json"), "utf8")), {
    timestamp,
    counts,
    databaseName: "au_connect",
    scriptVersion: RESET_SCRIPT_VERSION,
  });
});
