import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PrismaClient, Skill } from "../lib/generated/prisma";
import { aliasesFor, databaseUrl, dryRunArgument, groupSkills, mergeGroup, normalize, safeError, CSV_PATH } from "../scripts/lib/skill-tools";
import { csvRows, escoSkill } from "../scripts/lib/esco-import";
import {
  importEsco,
  parseImportArguments,
} from "../scripts/import-esco-skills";

const skill = (id: string, name: string, extra: Partial<Skill> = {}): Skill => ({
  id, name, normalizedName: normalize(name), aliases: [], normalizedAliases: [],
  source: "USER_CREATED", externalId: null, escoVersion: null, ...extra,
});
type Link = { id: string; skillId: string; jobPostId?: string; userId?: string; order: number };
function memoryDb(initial: Skill[], initialJobs: Link[] = [], initialUsers: Link[] = []) {
  const state = { skills: structuredClone(initial), jobs: structuredClone(initialJobs), users: structuredClone(initialUsers) };
  let writes = 0;
  let failDelete = false;
  type Where = Record<string, unknown>;
  function matches(row: object, where: Where = {}): boolean {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR" && Array.isArray(value)) {
        return value.some((condition) => matches(row, condition as Where));
      }
      const actual = (row as Record<string, unknown>)[key];
      if (value && typeof value === "object") {
        const filter = value as { in?: unknown[]; gt?: string };
        return filter.in ? filter.in.includes(actual) : String(actual) > filter.gt!;
      }
      return actual === value;
    });
  }
  function table(key: keyof typeof state) {
    const rows = () => state[key] as (Skill | Link)[];
    return {
      async findMany({ where, take }: { where?: Where; take?: number } = {}) {
        return structuredClone(rows().filter((row) => matches(row, where)).sort((a, b) => a.id.localeCompare(b.id)).slice(0, take));
      },
      async findFirst({ where }: { where: Where }) { return structuredClone(rows().find((row) => matches(row, where)) ?? null); },
      async count({ where }: { where: Where }) { return rows().filter((row) => matches(row, where)).length; },
      async update({ where, data }: { where: Where; data: object }) {
        writes++;
        const row = rows().find((r) => matches(r, where));
        assert.ok(row);
        const updated = { ...row, ...data };
        if (key !== "skills") {
          const relation = updated as Link;
          assert.ok(!rows().some((other) => other.id !== row.id && (other as Link).skillId === relation.skillId &&
            (key === "jobs" ? (other as Link).jobPostId === relation.jobPostId : (other as Link).userId === relation.userId)), "unique relation constraint");
        }
        Object.assign(row, data);
        return structuredClone(row);
      },
      async delete({ where }: { where: Where }) {
        writes++;
        if (key === "skills") {
          if (failDelete) throw new Error("injected failure");
          assert.ok(![...state.jobs, ...state.users].some((r) => r.skillId === where.id), "delete only after moving all relations");
        }
        const index = rows().findIndex((r) => matches(r, where));
        assert.ok(index >= 0);
        return rows().splice(index, 1)[0];
      },
      async create({ data }: { data: object }) {
        writes++;
        const created = { id: `new-${writes}`, ...data } as Skill;
        rows().push(created);
        return structuredClone(created);
      },
    };
  }
  const raw = {
    skill: table("skills"), jobSkill: table("jobs"), userSkill: table("users"),
    async $transaction<T>(work: (tx: PrismaClient) => Promise<T>) {
      const snapshot = structuredClone(state);
      try { return await work(raw as unknown as PrismaClient); }
      catch (error) { Object.assign(state, snapshot); throw error; }
    },
  };
  return { db: raw as unknown as PrismaClient, state, writes: () => writes, failDelete: () => { failDelete = true; } };
}

function csvFile(t: TestContext, body: string) {
  const dir = mkdtempSync(join(tmpdir(), "esco-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "skills.csv");
  writeFileSync(path, body);
  return path;
}
function failedFile(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "esco-failed-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, "failed.json");
}
const header = "conceptUri,preferredLabel,altLabels\n";
const uri = "http://data.europa.eu/esco/skill/test";

test("normalization uses NFKC, whitespace collapse and lowercase", () => {
  assert.equal(normalize("  ＲＥＡＣＴ\t\n JS  "), "react js");
  assert.deepEqual(aliasesFor([" JS ", "js", "JavaScript", ""], "javascript"), { aliases: ["JS"], normalizedAliases: ["js"] });
  assert.throws(() => dryRunArgument(["--dryrun"]));
  assert.equal(parseImportArguments(["--dry-run"]).dryRun, true);
  assert.throws(() => parseImportArguments(["--retry-file"]));
});

test("database loader uses app precedence independent of cwd and rejects empty overrides", (t) => {
  const path = csvFile(t, "");
  const dir = join(path, "..");
  writeFileSync(join(dir, ".env"), "DATABASE_URL=mongodb://base/db\n");
  writeFileSync(join(dir, ".env.local"), "DATABASE_URL=mongodb://local/db\n");
  assert.equal(databaseUrl({}, dir), "mongodb://local/db");
  assert.equal(databaseUrl({ DATABASE_URL: "mongodb://explicit/db" }, dir), "mongodb://explicit/db");
  assert.throws(() => databaseUrl({ DATABASE_URL: "" }, dir));
  assert.ok(!safeError(new Error("mongodb://secret@host/db")).includes("secret"));
});

test("duplicate merge preserves relations, resolves unique collisions and keeps earliest user order", async () => {
  const skills = [skill("a", "React"), skill("b", "react"), skill("c", "REACT")];
  const jobs = [{ id: "j1", skillId: "a", jobPostId: "p1", order: 0 }, { id: "j2", skillId: "b", jobPostId: "p1", order: 0 }, { id: "j3", skillId: "c", jobPostId: "p2", order: 0 }];
  const users = [{ id: "u1", skillId: "a", userId: "x", order: 5 }, { id: "u2", skillId: "b", userId: "x", order: 1 }, { id: "u3", skillId: "c", userId: "y", order: 3 }];
  const mock = memoryDb(skills, jobs, users);
  const group = [...groupSkills(skills).values()][0];
  const before = structuredClone(mock.state);
  const planned = await mergeGroup(mock.db, group, true);
  assert.deepEqual(mock.state, before);
  assert.equal(mock.writes(), 0);
  const applied = await mock.db.$transaction((tx) => mergeGroup(tx, group, false));
  assert.deepEqual(applied, planned);
  assert.deepEqual(applied, { jobMoved: 1, jobDeduplicated: 1, userMoved: 1, userDeduplicated: 1 });
  assert.equal(mock.state.skills.length, 1);
  assert.equal(mock.state.users[0].order, 1);
  assert.ok([...mock.state.jobs, ...mock.state.users].every((r) => r.skillId === "a"));
  assert.equal(mock.state.users.find((r) => r.userId === "y")?.order, 3);
});

test("failed duplicate deletion rolls back relation moves", async () => {
  const skills = [skill("a", "React"), skill("b", "react")];
  const mock = memoryDb(skills, [{ id: "j", skillId: "b", jobPostId: "p", order: 0 }]);
  const before = structuredClone(mock.state);
  mock.failDelete();
  await assert.rejects(mock.db.$transaction((tx) => mergeGroup(tx, skills, false)));
  assert.deepEqual(mock.state, before);
});

test("canonical selection is deterministic and conflicting ESCO IDs are rejected", () => {
  const a = skill("a", "React"), b = skill("b", "react", { source: "ESCO", externalId: uri });
  assert.equal([...groupSkills([a, b]).values()][0][0].id, "b");
  assert.throws(() => groupSkills([b, { ...a, externalId: `${uri}2` }]));
  assert.throws(() => groupSkills([skill("a", "   ")]));
});

test("CSV streaming handles reordered headers, BOM, commas, quotes and multiline aliases", async (t) => {
  const path = csvFile(t, '\uFEFFaltLabels,conceptUri,preferredLabel\r\n"one, two\n""quoted""",' + uri + ',Example\r\n');
  const result = [];
  for await (const row of csvRows(path)) result.push(escoSkill(row));
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].aliases, ['"quoted"', 'one, two']);
  const bad = csvFile(t, "name,uri\nx,y\n");
  await assert.rejects(async () => { for await (const row of csvRows(bad)) void row; }, /Missing CSV header/);
});

test("import updates existing ID, preserves relations, inserts and is idempotent", async (t) => {
  t.mock.method(console, "info", () => {});
  const path = csvFile(t, header + `${uri},React,"React.js\nReact JS"\n${uri}2,TypeScript,TS\n`);
  const mock = memoryDb([skill("a", "react")], [{ id: "j", skillId: "a", jobPostId: "p", order: 0 }]);
  const before = structuredClone(mock.state);
  assert.deepEqual(await importEsco(mock.db, true, path), { read: 2, inserted: 1, updated: 1, skipped: 0, retried: 0, failed: 0 });
  assert.deepEqual(mock.state, before);
  assert.equal(mock.writes(), 0);
  const failures = failedFile(t);
  assert.deepEqual(await importEsco(mock.db, { inputPath: path, failedFilePath: failures }), { read: 2, inserted: 1, updated: 1, skipped: 0, retried: 0, failed: 0 });
  assert.equal(mock.state.skills[0].id, "a");
  assert.equal(mock.state.skills[0].source, "ESCO");
  assert.equal(mock.state.skills[0].escoVersion, "1.2.1");
  assert.deepEqual(mock.state.jobs, before.jobs);
  assert.deepEqual(await importEsco(mock.db, { inputPath: path, failedFilePath: failures }), { read: 2, inserted: 0, updated: 0, skipped: 2, retried: 0, failed: 0 });
});

test("import refuses unnormalized data and reports partial/invalid imports", async (t) => {
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  const path = csvFile(t, header + `${uri},React,\n${uri}2,REACT,\ninvalid,TypeScript,\n`);
  const mock = memoryDb([]);
  const result = await importEsco(mock.db, { inputPath: path, failedFilePath: failedFile(t) });
  assert.equal(result.inserted, 1);
  assert.equal(result.failed, 2);
  assert.equal(mock.state.skills[0].externalId, uri);
  const unnormalized = memoryDb([skill("a", "React", { normalizedName: null })]);
  assert.equal((await importEsco(unnormalized.db, { inputPath: path, failedFilePath: failedFile(t) })).failed, 1);
  assert.equal(unnormalized.writes(), 0);
  const empty = csvFile(t, header);
  assert.equal((await importEsco(memoryDb([]).db, true, empty)).failed, 1);
});

test("actual ESCO file has supported headers and valid records (no database access)", async () => {
  let count = 0;
  for await (const row of csvRows(CSV_PATH)) { escoSkill(row); count++; }
  assert.ok(count > 0);
});

test("import handles multiple batches, duplicate rows, and a truncated CSV", async (t) => {
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  const rows = Array.from({ length: 101 }, (_, i) => `${uri}${i},Skill ${i},\n`).join("");
  const path = csvFile(t, header + rows + `${uri}0,Skill 0,\n`);
  const mock = memoryDb([]);
  assert.deepEqual(await importEsco(mock.db, { inputPath: path, failedFilePath: failedFile(t) }), { read: 102, inserted: 101, updated: 0, skipped: 1, retried: 0, failed: 0 });
  assert.equal(mock.state.skills.length, 101);
  const truncated = csvFile(t, header + `${uri},React,"unterminated`);
  assert.ok((await importEsco(memoryDb([]).db, true, truncated)).failed > 0);
});

test("transient P2028 succeeds after bounded retry and writes an empty retry file", async (t) => {
  const path = csvFile(t, header + `${uri},React,React.js\n`);
  const output = failedFile(t);
  const mock = memoryDb([]);
  const skillDelegate = mock.db.skill as unknown as {
    create(args: unknown): Promise<Skill>;
  };
  const originalCreate = skillDelegate.create.bind(skillDelegate);
  let attempts = 0;
  skillDelegate.create = async (args: unknown) => {
    attempts += 1;
    if (attempts < 3) {
      throw Object.assign(new Error("Transaction already closed"), {
        code: "P2028",
        meta: { attempt: attempts },
      });
    }
    return originalCreate(args);
  };
  const delays: number[] = [];
  const logs: string[] = [];
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", (message: unknown) => logs.push(String(message)));

  const totals = await importEsco(mock.db, {
    inputPath: path,
    failedFilePath: output,
    sleep: async (milliseconds) => { delays.push(milliseconds); },
  });

  assert.deepEqual(totals, { read: 1, inserted: 1, updated: 0, skipped: 0, retried: 2, failed: 0 });
  assert.deepEqual(delays, [100, 200]);
  assert.equal(logs.length, 2);
  const firstLog = JSON.parse(logs[0]);
  assert.deepEqual(
    {
      code: firstLog.code,
      message: firstLog.message,
      meta: firstLog.meta,
      recordNumber: firstLog.recordNumber,
      conceptUri: firstLog.conceptUri,
      preferredLabel: firstLog.preferredLabel,
    },
    {
      code: "P2028",
      message: "Transaction already closed",
      meta: { attempt: 1 },
      recordNumber: 1,
      conceptUri: uri,
      preferredLabel: "React",
    },
  );
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")).records, []);
});

test("permanent Prisma failure is not retried and can be imported from retry file", async (t) => {
  const path = csvFile(t, header + `${uri},React,React.js\n`);
  const output = failedFile(t);
  const mock = memoryDb([]);
  const skillDelegate = mock.db.skill as unknown as {
    create(args: unknown): Promise<Skill>;
  };
  const originalCreate = skillDelegate.create.bind(skillDelegate);
  let shouldFail = true;
  let attempts = 0;
  skillDelegate.create = async (args: unknown) => {
    attempts += 1;
    if (shouldFail) {
      throw Object.assign(new Error("Raw query failed"), {
        code: "P2010",
        meta: { database_error: "test failure" },
      });
    }
    return originalCreate(args);
  };
  const logs: string[] = [];
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", (message: unknown) => logs.push(String(message)));

  const failed = await importEsco(mock.db, {
    inputPath: path,
    failedFilePath: output,
    sleep: async () => assert.fail("P2010 must not be retried"),
  });
  assert.deepEqual(failed, { read: 1, inserted: 0, updated: 0, skipped: 0, retried: 0, failed: 1 });
  assert.equal(attempts, 1);
  const retryContents = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(retryContents.records[0].recordNumber, 1);
  assert.equal(retryContents.records[0].conceptUri, uri);
  assert.equal(retryContents.records[0].preferredLabel, "React");
  assert.equal(retryContents.records[0].error.code, "P2010");
  assert.ok(logs[0].includes('"meta":{"database_error":"test failure"}'));

  shouldFail = false;
  const retried = await importEsco(mock.db, {
    retryFilePath: output,
    failedFilePath: output,
  });
  assert.deepEqual(retried, { read: 1, inserted: 1, updated: 0, skipped: 0, retried: 0, failed: 0 });
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")).records, []);

  const rerun = await importEsco(mock.db, {
    inputPath: path,
    failedFilePath: output,
  });
  assert.deepEqual(rerun, { read: 1, inserted: 0, updated: 0, skipped: 1, retried: 0, failed: 0 });
});

test("persistent P2028 stops after three retries", async (t) => {
  const path = csvFile(t, header + `${uri},React,\n`);
  const output = failedFile(t);
  const mock = memoryDb([]);
  let attempts = 0;
  const skillDelegate = mock.db.skill as unknown as {
    create(args: unknown): Promise<Skill>;
  };
  skillDelegate.create = async () => {
    attempts += 1;
    throw Object.assign(new Error("Transaction expired"), {
      code: "P2028",
      meta: { cause: "timeout" },
    });
  };
  const delays: number[] = [];
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});

  const totals = await importEsco(mock.db, {
    inputPath: path,
    failedFilePath: output,
    sleep: async (milliseconds) => { delays.push(milliseconds); },
  });

  assert.deepEqual(totals, { read: 1, inserted: 0, updated: 0, skipped: 0, retried: 3, failed: 1 });
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [100, 200, 400]);
  assert.equal(JSON.parse(readFileSync(output, "utf8")).records[0].error.code, "P2028");
});
