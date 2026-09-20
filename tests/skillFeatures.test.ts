import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { MAX_PROFILE_SKILLS, MAX_SKILL_SEARCH_RESULTS } from "../lib/constants";
import {
  clampSkillSearchLimit,
  escapeRegex,
  searchSkills,
} from "../lib/server/skillSearch.server";
import {
  removeProfileSkill,
  replaceProfileSkills,
  validateProfileSkillIds,
} from "../lib/server/profileSkills.server";
import { syncJobSkills } from "../lib/jobSkillFunctions";

for (const name of [
  "DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET", "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_ACCOUNT_NAME", "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_STORAGE_CONTAINER_NAME", "NEXT_PUBLIC_BASE_URL", "JWT_SECRET",
]) process.env[name] ||= "test";

const searchRoutePromise = import("../app/api/connect/v1/skills/search/route");

const row = (
  id: string,
  name: string,
  aliases: string[] = [],
  users = 0,
  jobs = 0,
  popularity: number | null = null,
) => ({
  id,
  name,
  normalizedName: name.toLowerCase(),
  normalizedAliases: aliases,
  popularity,
  _count: { userSkills: users, jobSkills: jobs },
});

test("skill search rejects unauthenticated requests", async () => {
  const { GET: searchRoute } = await searchRoutePromise;
  const response = await searchRoute(
    new NextRequest("http://localhost/api/connect/v1/skills/search?q=react"),
  );
  assert.equal(response.status, 401);
});

test("skill search enforces query length, clamps limits, and bounds catalogue reads", async () => {
  let calls = 0;
  const store = {
    async findMany(args: unknown) {
      calls++;
      const take = (args as { take?: number }).take;
      assert.ok(take !== undefined && take <= 500);
      return [row("a", "React")];
    },
  };
  assert.deepEqual(await searchSkills(" r ", 10, store), []);
  assert.equal(calls, 0);
  assert.equal(clampSkillSearchLimit(500), MAX_SKILL_SEARCH_RESULTS);
  await searchSkills("react", 500, store);
  assert.equal(calls, 1);
});

test("skill search ranks exact name, exact alias, prefixes, substring, then popularity", async () => {
  const store = {
    async findMany() {
      return [
        row("contains", "Using React", [], 100),
        row("alias", "ECMAScript library", ["react"], 50),
        row("prefix-low", "React Native", [], 0, 0, 0.1),
        row("prefix-high", "Reactive programming", [], 0, 0, 0.2),
        row("alias-prefix", "UI library", ["react tooling"]),
        row("exact", "React", [], 0),
      ];
    },
  };
  const results = await searchSkills("  REACT  ", 10, store);
  assert.deepEqual(results.map(({ id }) => id), [
    "exact", "alias", "prefix-high", "prefix-low", "alias-prefix", "contains",
  ]);
  assert.equal(escapeRegex("c++ [web].*"), "c\\+\\+ \\[web\\]\\.\\*");
});

test("profile skills enforce canonical IDs, uniqueness, and the server limit", () => {
  const ids = Array.from({ length: MAX_PROFILE_SKILLS }, (_, index) =>
    index.toString(16).padStart(24, "0"),
  );
  assert.deepEqual(validateProfileSkillIds(ids), ids);
  assert.throws(() => validateProfileSkillIds([...ids, "f".repeat(24)]), /at most/);
  assert.throws(() => validateProfileSkillIds([ids[0], ids[0]]), /Duplicate/);
  assert.throws(() => validateProfileSkillIds(["not-an-id"]), /invalid/);
});

test("profile owner replacement validates unknown IDs and writes only trusted user relations", async () => {
  const trustedUserId = "a".repeat(24);
  const skillIds = ["b".repeat(24), "c".repeat(24)];
  const created: Array<Record<string, unknown>> = [];
  let deletedFor = "";
  let refreshed = "";
  const db = {
    skill: {
      async findMany() {
        return skillIds.map((id, index) => ({ id, name: `Skill ${index}` }));
      },
    },
    userSkill: {
      async findUnique() { return null; },
      async delete() { assert.fail("not used"); },
    },
    async $transaction(callback: (tx: unknown) => Promise<unknown>) {
      return callback({
        userSkill: {
          async deleteMany(args: { where: { userId: string } }) {
            deletedFor = args.where.userId;
          },
          async create(args: { data: Record<string, unknown> }) {
            created.push(args.data);
          },
        },
      });
    },
  };
  const result = await replaceProfileSkills(
    trustedUserId,
    skillIds,
    db as never,
    async (id) => { refreshed = id; },
  );
  assert.equal(deletedFor, trustedUserId);
  assert.ok(created.every(({ userId }) => userId === trustedUserId));
  assert.deepEqual(result.map(({ id }) => id), skillIds);
  assert.equal(refreshed, trustedUserId);

  db.skill.findMany = async () => [{ id: skillIds[0], name: "Only one" }];
  await assert.rejects(
    replaceProfileSkills(trustedUserId, skillIds, db as never, async () => {}),
    /do not exist/,
  );
});

test("removing a profile skill deletes only UserSkill, never the Skill catalogue", async () => {
  const userId = "a".repeat(24);
  const skillId = "b".repeat(24);
  let deletedRelation = "";
  const db = {
    skill: { async findMany() { return []; } },
    userSkill: {
      async findUnique() { return { id: "relation-id" }; },
      async delete(args: { where: { id: string } }) {
        deletedRelation = args.where.id;
      },
    },
    async $transaction() { assert.fail("not used"); },
  };
  await removeProfileSkill(userId, skillId, db, async () => {});
  assert.equal(deletedRelation, "relation-id");
  assert.equal("delete" in db.skill, false);
});

test("job skills use existing canonical IDs and preserve the shared catalogue", async () => {
  const ids = ["b".repeat(24), "c".repeat(24)];
  const linked: string[] = [];
  let relationsCleared = false;
  const tx = {
    skill: {
      async findMany() { return ids.map((id) => ({ id })); },
    },
    jobSkill: {
      async deleteMany() { relationsCleared = true; },
      async create({ data }: { data: { skillId: string } }) {
        linked.push(data.skillId);
      },
    },
  };
  await syncJobSkills(tx as never, "job-id", ids);
  assert.equal(relationsCleared, true);
  assert.deepEqual(linked, ids);
  assert.equal("delete" in tx.skill, false);
  await assert.rejects(syncJobSkills(tx as never, "job-id", [ids[0], ids[0]]), /Duplicate/);
});
