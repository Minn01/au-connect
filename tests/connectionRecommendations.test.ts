import assert from "node:assert/strict";
import test from "node:test";

function runtimeExports<T>(module: unknown): T {
  return ((module as { default?: T }).default ?? module) as T;
}

const recommendationsModulePromise = import(
  "../lib/server/connectionRecommendations.server"
).then((module) =>
  runtimeExports<
    typeof import("../lib/server/connectionRecommendations.server")
  >(module),
);

const currentUserId = "a".repeat(24);
const firstUserId = "b".repeat(24);
const secondUserId = "c".repeat(24);

test("loads connection recommendations with the internal key and hydrates safe user fields", async (t) => {
  const { getConnectionRecommendations } =
    await recommendationsModulePromise;
  process.env.RECOMMENDATION_SERVICE_URL =
    "http://recommendation.test/service///";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "shared-recommendation-secret";

  let requestUrl = "";
  let requestMethod = "";
  let requestKey = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      requestUrl = String(input);
      requestMethod = init?.method ?? "";
      requestKey =
        new Headers(init?.headers).get("x-internal-service-key") ?? "";
      return Response.json({
        success: true,
        data: {
          recommendations: [
            {
              user: {
                _id: { $oid: secondUserId },
                email: "must-not-reach-browser@example.com",
              },
              score: 0.82,
            },
            { user: { id: firstUserId }, score: 0.71 },
          ],
          nextCursor: "next-page-token",
          hasMore: true,
        },
        error: null,
      });
    },
  );

  const userStore = {
    findMany: async () => [
      {
        id: firstUserId,
        username: "First Member",
        title: "Designer",
        profilePic: null,
        location: "Bangkok",
      },
      {
        id: secondUserId,
        username: "Second Member",
        title: "Engineer",
        profilePic: "profile.jpg",
        location: null,
      },
    ],
  } as unknown as Parameters<typeof getConnectionRecommendations>[3];

  const result = await getConnectionRecommendations(
    currentUserId,
    10,
    null,
    userStore,
  );

  assert.equal(
    requestUrl,
    `http://recommendation.test/service/recommendations/connections/${currentUserId}?limit=10`,
  );
  assert.equal(requestMethod, "GET");
  assert.equal(requestKey, "shared-recommendation-secret");
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.nextCursor, "next-page-token");
    assert.equal(result.hasMore, true);
    assert.deepEqual(
      result.recommendations.map(({ user, score }) => ({
        id: user.id,
        username: user.username,
        score,
      })),
      [
        { id: secondUserId, username: "Second Member", score: 0.82 },
        { id: firstUserId, username: "First Member", score: 0.71 },
      ],
    );
  }
  assert.equal(
    JSON.stringify(result).includes("must-not-reach-browser@example.com"),
    false,
  );
  assert.equal(
    JSON.stringify(result).includes("shared-recommendation-secret"),
    false,
  );
});

test("forwards an opaque service cursor without inspecting it", async (t) => {
  const { getConnectionRecommendations } =
    await recommendationsModulePromise;
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "shared-recommendation-secret";

  let requestUrl = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request) => {
      requestUrl = String(input);
      return Response.json({
        success: true,
        data: {
          recommendations: [],
          nextCursor: null,
          hasMore: false,
        },
        error: null,
      });
    },
  );

  const result = await getConnectionRecommendations(
    currentUserId,
    20,
    "opaque+/=cursor",
  );

  assert.equal(
    requestUrl,
    `http://recommendation.test/recommendations/connections/${currentUserId}?limit=20&cursor=opaque%2B%2F%3Dcursor`,
  );
  assert.deepEqual(result, {
    success: true,
    recommendations: [],
    nextCursor: null,
    hasMore: false,
  });
});

test("handles recommendation service and configuration failures without exposing the key", async (t) => {
  const { getConnectionRecommendations } =
    await recommendationsModulePromise;
  const logs: string[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });

  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "never-expose-this-key";
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 503 }),
  );

  assert.deepEqual(
    await getConnectionRecommendations(currentUserId, 10),
    { success: false, reason: "request" },
  );

  globalThis.fetch = async () => {
    throw new TypeError("network unavailable");
  };
  assert.deepEqual(
    await getConnectionRecommendations(currentUserId, 10),
    { success: false, reason: "request" },
  );

  globalThis.fetch = async () => Response.json({ success: true, data: {} });
  assert.deepEqual(
    await getConnectionRecommendations(currentUserId, 10),
    { success: false, reason: "response" },
  );

  process.env.RECOMMENDATION_SERVICE_URL = "invalid URL";
  assert.deepEqual(
    await getConnectionRecommendations(currentUserId, 10),
    { success: false, reason: "configuration" },
  );

  delete process.env.RECOMMENDATION_SERVICE_API_KEY;
  assert.deepEqual(
    await getConnectionRecommendations(currentUserId, 10),
    { success: false, reason: "configuration" },
  );

  assert.equal(logs.join("\n").includes("never-expose-this-key"), false);
});
