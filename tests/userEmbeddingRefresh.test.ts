import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

for (const name of [
  "DATABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "LINKEDIN_CLIENT_ID",
  "LINKEDIN_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_CONNECTION_STRING",
  "AZURE_STORAGE_CONTAINER_NAME",
  "JWT_SECRET",
  "RECOMMENDATION_SERVICE_URL",
  "RECOMMENDATION_SERVICE_API_KEY",
]) {
  process.env[name] = "test";
}

const userId = "a".repeat(24);
const userEmail = "member@example.com";

function runtimeExports<T>(module: unknown): T {
  return ((module as { default?: T }).default ?? module) as T;
}

const modulesPromise = Promise.all([
  import("../lib/generalFieldsFunctions"),
  import("../lib/profileAboutFunctions"),
  import("../lib/experienceFunctions"),
  import("../lib/educationFunctions"),
  import("../lib/server/userEmbeddingRefresh.server"),
]).then(([general, about, experience, education, embedding]) => {
  return {
    ...runtimeExports<typeof import("../lib/generalFieldsFunctions")>(general),
    ...runtimeExports<typeof import("../lib/profileAboutFunctions")>(about),
    ...runtimeExports<typeof import("../lib/experienceFunctions")>(experience),
    ...runtimeExports<typeof import("../lib/educationFunctions")>(education),
    ...runtimeExports<typeof import("../lib/server/userEmbeddingRefresh.server")>(
      embedding,
    ),
  };
});

function jsonRequest(body: Record<string, unknown>, method = "POST") {
  return new NextRequest("http://localhost:3000/profile-operation", {
    method,
    headers: {
      "content-type": "application/json",
      "x-user-email": userEmail,
      "x-user-id": userId,
    },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new NextRequest("http://localhost:3000/profile-operation", {
    method: "DELETE",
    headers: {
      "x-user-email": userEmail,
      "x-user-id": userId,
    },
  });
}

const experienceInput = {
  title: "Engineer",
  employmentType: "FULL_TIME",
  company: "AU Connect",
  startMonth: 0,
  startYear: 2024,
  endMonth: 1,
  endYear: 2025,
  isCurrent: false,
};

const educationInput = {
  school: "Assumption University",
  degree: "Bachelor's",
  fieldOfStudy: "Computer Science",
  startMonth: 0,
  startYear: 2020,
  endMonth: 1,
  endYear: 2024,
};

test("embedding helper sends the authenticated PUT to a correctly joined URL", async (t) => {
  const { requestUserEmbeddingRefresh } = await modulesPromise;
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test/base///";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "shared-test-secret";

  let capturedUrl = "";
  let capturedMethod = "";
  let capturedHeader = "";
  let hasAbortSignal = false;

  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method ?? "";
      capturedHeader = new Headers(init?.headers).get("x-internal-service-key") ?? "";
      hasAbortSignal = init?.signal instanceof AbortSignal;
      return new Response(null, { status: 202 });
    },
  );

  const result = await requestUserEmbeddingRefresh(userId);

  assert.deepEqual(result, { success: true, status: 202 });
  assert.equal(
    capturedUrl,
    `http://recommendation.test/base/internal/users/${userId}/embedding`,
  );
  assert.equal(capturedMethod, "PUT");
  assert.equal(capturedHeader, "shared-test-secret");
  assert.equal(hasAbortSignal, true);
  assert.equal(JSON.stringify(result).includes("shared-test-secret"), false);
});

test("embedding helper handles non-202, network, timeout, and invalid configuration without exposing secrets", async (t) => {
  const { requestUserEmbeddingRefresh } = await modulesPromise;
  const logs: string[] = [];
  t.mock.method(console, "error", (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });

  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "never-log-this-secret";

  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  const rejected = await requestUserEmbeddingRefresh(userId);
  assert.deepEqual(rejected, {
    success: false,
    reason: "unexpected-status",
    status: 503,
  });

  globalThis.fetch = async () => {
    throw new TypeError("socket unavailable");
  };
  const networkFailure = await requestUserEmbeddingRefresh(userId);
  assert.deepEqual(networkFailure, { success: false, reason: "network" });

  globalThis.fetch = async () => {
    throw new DOMException("timed out", "TimeoutError");
  };
  const timeout = await requestUserEmbeddingRefresh(userId);
  assert.deepEqual(timeout, { success: false, reason: "timeout" });

  process.env.RECOMMENDATION_SERVICE_URL = "not a URL";
  const malformed = await requestUserEmbeddingRefresh(userId);
  assert.deepEqual(malformed, { success: false, reason: "configuration" });

  delete process.env.RECOMMENDATION_SERVICE_URL;
  const missing = await requestUserEmbeddingRefresh(userId);
  assert.deepEqual(missing, { success: false, reason: "configuration" });

  assert.equal(logs.join("\n").includes("never-log-this-secret"), false);
  assert.equal(
    JSON.stringify([rejected, networkFailure, timeout, malformed, missing]).includes(
      "never-log-this-secret",
    ),
    false,
  );
});

test("user title and about changes refresh embeddings after successful writes", async () => {
  const { updateGeneralFields, updateAbout } = await modulesPromise;
  const events: string[] = [];
  const userStore = {
    findUnique: async () => ({ title: "Student", about: "Old" }),
    update: async () => {
      events.push("database");
      return { id: userId, username: "Member", title: "Engineer", about: "New" };
    },
  } as unknown as Parameters<typeof updateGeneralFields>[2];
  const refresh = async (refreshedUserId: string) => {
    assert.equal(refreshedUserId, userId);
    events.push("refresh");
  };

  const titleResponse = await updateGeneralFields(
    jsonRequest({ username: "Member", title: "Engineer", location: "Bangkok" }),
    refresh,
    userStore,
  );
  assert.equal(titleResponse.status, 200);
  assert.deepEqual(events, ["database", "refresh"]);

  events.length = 0;
  const aboutResponse = await updateAbout(
    jsonRequest({ about: "New" }, "PUT"),
    refresh,
    userStore,
  );
  assert.equal(aboutResponse.status, 200);
  assert.deepEqual(events, ["database", "refresh"]);
});

test("unrelated user fields do not refresh embeddings", async () => {
  const { updateGeneralFields } = await modulesPromise;
  const userStore = {
    findUnique: async () => ({ title: "Student", about: "About" }),
    update: async () => ({
      id: userId,
      username: "Member",
      title: "Student",
      about: "About",
      location: "Chiang Mai",
    }),
  } as unknown as Parameters<typeof updateGeneralFields>[2];
  let refreshes = 0;

  const response = await updateGeneralFields(
    jsonRequest({
      username: "Member",
      location: "Chiang Mai",
      phoneNo: "081-234-5678",
      phonePublic: true,
      emailPublic: false,
    }),
    async () => {
      refreshes++;
    },
    userStore,
  );

  assert.equal(response.status, 200);
  assert.equal(refreshes, 0);
});

test("experience create, delete, and title changes refresh; other edits do not", async () => {
  const {
    addExperience,
    updateExperience,
    deleteExperience,
  } = await modulesPromise;
  const experienceStore = {
    create: async () => ({ id: "experience-1", ...experienceInput, userId }),
    findFirst: async () => ({ id: "experience-1", ...experienceInput, userId }),
    update: async (args: { data: Record<string, unknown> }) => ({
      id: "experience-1",
      ...args.data,
      userId,
    }),
    delete: async () => ({ id: "experience-1", ...experienceInput, userId }),
  } as unknown as Parameters<typeof addExperience>[2];
  const refreshed: string[] = [];
  const refresh = async (refreshedUserId: string) => {
    refreshed.push(refreshedUserId);
  };

  assert.equal(
    (await addExperience(jsonRequest(experienceInput), refresh, experienceStore)).status,
    201,
  );
  assert.equal(
    (
      await updateExperience(
        jsonRequest({ ...experienceInput, title: "Lead Engineer" }, "PUT"),
        "experience-1",
        refresh,
        experienceStore,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await updateExperience(
        jsonRequest(
          {
            ...experienceInput,
            company: "Different company",
            employmentType: "PART_TIME",
            startMonth: 2,
            endMonth: 3,
          },
          "PUT",
        ),
        "experience-1",
        refresh,
        experienceStore,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await deleteExperience(
        deleteRequest(),
        "experience-1",
        refresh,
        experienceStore,
      )
    ).status,
    200,
  );

  assert.deepEqual(refreshed, [userId, userId, userId]);
});

test("education create, delete, and field-of-study changes refresh; other edits do not", async () => {
  const { addEducation, updateEducation, deleteEducation } =
    await modulesPromise;
  const educationStore = {
    create: async () => ({ id: "education-1", ...educationInput, userId }),
    findFirst: async () => ({ id: "education-1", ...educationInput, userId }),
    update: async (args: { data: Record<string, unknown> }) => ({
      id: "education-1",
      ...args.data,
      userId,
    }),
    delete: async () => ({ id: "education-1", ...educationInput, userId }),
  } as unknown as Parameters<typeof addEducation>[2];
  const refreshed: string[] = [];
  const refresh = async (refreshedUserId: string) => {
    refreshed.push(refreshedUserId);
  };

  assert.equal(
    (await addEducation(jsonRequest(educationInput), refresh, educationStore)).status,
    201,
  );
  assert.equal(
    (
      await updateEducation(
        jsonRequest({ ...educationInput, fieldOfStudy: "Data Science" }, "PUT"),
        "education-1",
        refresh,
        educationStore,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await updateEducation(
        jsonRequest(
          {
            ...educationInput,
            school: "Different university",
            degree: "Master's",
            startMonth: 2,
            endMonth: 3,
          },
          "PUT",
        ),
        "education-1",
        refresh,
        educationStore,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await deleteEducation(
        deleteRequest(),
        "education-1",
        refresh,
        educationStore,
      )
    ).status,
    200,
  );

  assert.deepEqual(refreshed, [userId, userId, userId]);
});

test("a failed database write does not request a refresh", async (t) => {
  const { updateGeneralFields } = await modulesPromise;
  t.mock.method(console, "error", () => undefined);
  const userStore = {
    findUnique: async () => ({ title: "Student", about: null }),
    update: async () => {
      throw new Error("database unavailable");
    },
  } as unknown as Parameters<typeof updateGeneralFields>[2];
  let refreshes = 0;

  const response = await updateGeneralFields(
    jsonRequest({ username: "Member", title: "Engineer" }),
    async () => {
      refreshes++;
    },
    userStore,
  );

  assert.equal(response.status, 500);
  assert.equal(refreshes, 0);
});

test("refresh transport failures do not alter a successful profile response", async (t) => {
  const { updateGeneralFields, requestUserEmbeddingRefresh } =
    await modulesPromise;
  process.env.RECOMMENDATION_SERVICE_URL = "http://recommendation.test";
  process.env.RECOMMENDATION_SERVICE_API_KEY = "client-invisible-secret";
  t.mock.method(console, "error", () => undefined);
  const userStore = {
    findUnique: async () => ({ title: "Student", about: null }),
    update: async () => ({
      id: userId,
      username: "Member",
      title: "Engineer",
    }),
  } as unknown as Parameters<typeof updateGeneralFields>[2];

  let attempt = 0;
  t.mock.method(globalThis, "fetch", async () => {
    attempt++;
    if (attempt === 1) throw new TypeError("network unavailable");
    return new Response(null, { status: 503 });
  });

  for (let index = 0; index < 2; index++) {
    const response = await updateGeneralFields(
      jsonRequest({ username: "Member", title: "Engineer" }),
      requestUserEmbeddingRefresh,
      userStore,
    );
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), {
      success: true,
      user: { id: userId, username: "Member", title: "Engineer" },
    });
    assert.equal(body.includes("client-invisible-secret"), false);
  }
});
