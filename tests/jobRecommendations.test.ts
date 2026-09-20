import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  deleteJobEmbedding,
  getJobRecommendations,
  refreshJobEmbedding,
  runJobMutationWithEmbeddingSync,
} from "../lib/server/jobRecommendations.server";
import { hydrateRecommendedJobs } from "../lib/server/jobRecommendationHydration";

for (const name of [
  "DATABASE_URL", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET", "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET", "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_ACCOUNT_NAME", "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_STORAGE_CONTAINER_NAME", "NEXT_PUBLIC_BASE_URL", "JWT_SECRET",
]) process.env[name] ||= "test";

const recommendationRoutePromise = import(
  "../app/api/connect/v1/jobs/recommended/route"
);

const userId = "a".repeat(24);
const firstId = "b".repeat(24);
const secondId = "c".repeat(24);

test("job recommendations reject unauthenticated browser requests", async () => {
  const { GET } = await recommendationRoutePromise;
  const response = await GET(
    new NextRequest("http://localhost/api/connect/v1/jobs/recommended?userId=attacker"),
  );
  assert.equal(response.status, 401);
});

test("job recommendation client overfetch contract uses internal auth and preserves candidates", async (t) => {
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test/base/";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "shared-secret";
  let url = "";
  let key = "";
  t.mock.method(globalThis, "fetch", async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    url = String(input);
    key = new Headers(init?.headers).get("x-internal-service-key") ?? "";
    return Response.json({
      success: true,
      data: { recommendations: [
        { job: { id: firstId }, score: 0.8 },
        { jobPostId: secondId, score: 0.4 },
        { jobPostId: firstId, score: 0.1 },
      ] },
    });
  });
  const result = await getJobRecommendations(userId, 18);
  assert.equal(url, `http://recommendation.test/base/recommendations/jobs/${userId}?limit=18`);
  assert.equal(key, "shared-secret");
  assert.deepEqual(result, {
    ok: true,
    candidates: [
      { jobPostId: firstId, score: 0.8 },
      { jobPostId: secondId, score: 0.4 },
    ],
  });
});

test("embedding lifecycle calls use PUT/DELETE and require accepted refresh", async (t) => {
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "shared-secret";
  const methods: string[] = [];
  t.mock.method(globalThis, "fetch", async (
    _input: string | URL | Request,
    init?: RequestInit,
  ) => {
    methods.push(init?.method ?? "");
    return new Response(null, { status: init?.method === "PUT" ? 202 : 204 });
  });
  assert.deepEqual(await refreshJobEmbedding(firstId), { ok: true });
  assert.deepEqual(await deleteJobEmbedding(firstId), { ok: true });
  assert.deepEqual(methods, ["PUT", "DELETE"]);
});

test("job create, edit, and delete synchronization runs only after database success", async () => {
  for (const operation of ["create", "edit", "delete"] as const) {
    const events: string[] = [];
    const result = await runJobMutationWithEmbeddingSync(
      async () => {
        events.push(`database:${operation}`);
        return { id: firstId, operation };
      },
      ({ id }) => id,
      async (id) => {
        assert.equal(id, firstId);
        events.push(`embedding:${operation}`);
        return { ok: false, reason: "unavailable" };
      },
    );
    assert.equal(result.operation, operation);
    assert.deepEqual(events, [
      `database:${operation}`,
      `embedding:${operation}`,
    ]);
  }

  let synchronizationCalls = 0;
  await assert.rejects(
    runJobMutationWithEmbeddingSync(
      async () => { throw new Error("database failed"); },
      () => firstId,
      async () => { synchronizationCalls++; },
    ),
    /database failed/,
  );
  assert.equal(synchronizationCalls, 0);
});

test("an unexpected embedding exception does not undo a successful job mutation", async (t) => {
  t.mock.method(console, "error", () => undefined);
  const result = await runJobMutationWithEmbeddingSync(
    async () => ({ id: firstId, saved: true }),
    ({ id }) => id,
    async () => { throw new Error("service failed"); },
  );
  assert.equal(result.saved, true);
});

test("job recommendation client distinguishes auth, malformed, and unavailable failures", async (t) => {
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "never-log-this";
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 401 }));
  assert.deepEqual(await getJobRecommendations(userId, 10), {
    ok: false, reason: "authentication",
  });
  globalThis.fetch = async () => Response.json({ nope: true });
  assert.deepEqual(await getJobRecommendations(userId, 10), {
    ok: false, reason: "response",
  });
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  assert.deepEqual(await getJobRecommendations(userId, 10), {
    ok: false, reason: "unavailable",
  });
});

function job(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    jobTitle: `Job ${id[0]}`,
    companyName: "AU",
    location: "Bangkok",
    locationType: "HYBRID",
    employmentType: "FULL_TIME",
    status: "OPEN",
    positionsAvailable: 2,
    positionsFilled: 0,
    deadline: new Date("2030-01-01"),
    createdAt: new Date("2025-01-01"),
    jobSkills: [{ skill: { id: "d".repeat(24), name: "React" } }],
    applications: [],
    post: {
      id: `post-${id}`,
      userId: "e".repeat(24),
      actorType: "USER" as const,
      visibility: "everyone",
      moderationStatus: "VISIBLE",
      removedAt: null,
      community: null,
    },
    ...overrides,
  };
}

test("hydration preserves service order, deduplicates, explains exact skills, and filters inaccessible jobs", () => {
  const validSecond = job(secondId);
  const filled = job("1".repeat(24), { positionsFilled: 2 });
  const closed = job("2".repeat(24), { status: "CLOSED" });
  const expired = job("3".repeat(24), { deadline: new Date("2020-01-01") });
  const hidden = job("4".repeat(24), {
    post: { ...job("4".repeat(24)).post, moderationStatus: "REMOVED" },
  });
  const applied = job("5".repeat(24), { applications: [{ id: "application" }] });
  const privateJob = job("6".repeat(24), {
    post: { ...job("6".repeat(24)).post, visibility: "only-me" },
  });
  const validFirst = job(firstId, { location: "Elsewhere" });
  const jobs = [validFirst, filled, closed, expired, hidden, applied, privateJob, validSecond];
  const result = hydrateRecommendedJobs({
    candidateIds: [secondId, filled.id, closed.id, expired.id, hidden.id, applied.id, privateJob.id, firstId, secondId, "9".repeat(24)],
    jobs,
    userId,
    profileSkillIds: new Set(["d".repeat(24)]),
    profileLocation: "Bangkok",
    connectedIds: new Set(),
    limit: 6,
    now: new Date("2026-01-01").getTime(),
  });
  assert.deepEqual(result.map(({ id }) => id), [secondId, firstId]);
  assert.equal(result[0].explanation, "Matches 1 of your skills");
  assert.ok(!JSON.stringify(result).includes("score"));
  assert.ok(!JSON.stringify(result).includes("%"));
});
