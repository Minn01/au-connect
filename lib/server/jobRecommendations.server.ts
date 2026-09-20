import "server-only";

const TIMEOUT_MS = 3_000;
const INTERNAL_HEADER = "x-internal-service-key";

export type RecommendationFailure =
  | "configuration"
  | "timeout"
  | "authentication"
  | "unavailable"
  | "response";

export type JobRecommendationCandidate = { jobPostId: string; score: number };

function configuration() {
  const baseUrl = process.env.RECOMMENDATION_SERVICE_URL;
  const apiKey = process.env.RECOMMENDATION_SERVICE_API_KEY;
  if (!baseUrl || !apiKey) return null;
  try {
    const url = new URL(baseUrl);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    return { url, apiKey };
  } catch {
    return null;
  }
}

function endpoint(path: string) {
  const config = configuration();
  if (!config) return null;
  const requested = new URL(path, "http://internal.invalid");
  config.url.pathname = `${config.url.pathname.replace(/\/+$/, "")}${requested.pathname}`;
  config.url.search = requested.search;
  config.url.hash = "";
  return config;
}

function objectId(value: unknown): string | null {
  if (typeof value === "string" && /^[a-f\d]{24}$/i.test(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return objectId(record.id ?? record._id ?? record.jobPostId ?? record.job_post_id ?? record.$oid);
  }
  return null;
}

async function request(path: string, method: "GET" | "PUT" | "DELETE") {
  const config = endpoint(path);
  if (!config) return { ok: false as const, reason: "configuration" as const };
  try {
    const response = await fetch(config.url, {
      method,
      headers: { [INTERNAL_HEADER]: config.apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false as const, reason: "authentication" as const };
    }
    if (!response.ok) {
      return { ok: false as const, reason: "unavailable" as const };
    }
    return { ok: true as const, response };
  } catch (error) {
    const timeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false as const,
      reason: timeout ? ("timeout" as const) : ("unavailable" as const),
    };
  }
}

export async function getJobRecommendations(userId: string, limit: number) {
  const result = await request(
    `/recommendations/jobs/${encodeURIComponent(userId)}?limit=${limit}`,
    "GET",
  );
  if (!result.ok) return result;
  let payload: unknown;
  try {
    payload = await result.response.json();
  } catch {
    return { ok: false as const, reason: "response" as const };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false as const, reason: "response" as const };
  }
  const envelope = payload as Record<string, unknown>;
  const data =
    envelope.data && typeof envelope.data === "object"
      ? (envelope.data as Record<string, unknown>)
      : envelope;
  const raw = data.recommendations;
  if (!Array.isArray(raw)) {
    return { ok: false as const, reason: "response" as const };
  }
  const seen = new Set<string>();
  const candidates: JobRecommendationCandidate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const id = objectId(record.job ?? record.jobPost ?? record.jobPostId ?? record.job_id ?? record.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    candidates.push({
      jobPostId: id,
      score:
        typeof record.score === "number" && Number.isFinite(record.score)
          ? record.score
          : 0,
    });
  }
  return { ok: true as const, candidates };
}

async function embeddingRequest(jobPostId: string, method: "PUT" | "DELETE") {
  const result = await request(
    `/internal/jobs/${encodeURIComponent(jobPostId)}/embedding`,
    method,
  );
  if (!result.ok) {
    console.error("Job embedding synchronization failed", {
      jobPostId,
      operation: method === "PUT" ? "refresh" : "delete",
      reason: result.reason,
    });
    return result;
  }
  if (method === "PUT" && result.response.status !== 202) {
    console.error("Job embedding refresh returned an unexpected response", {
      jobPostId,
      status: result.response.status,
    });
    return { ok: false as const, reason: "response" as const };
  }
  return { ok: true as const };
}

export const refreshJobEmbedding = (jobPostId: string) =>
  embeddingRequest(jobPostId, "PUT");
export const deleteJobEmbedding = (jobPostId: string) =>
  embeddingRequest(jobPostId, "DELETE");

export async function runJobMutationWithEmbeddingSync<T>(
  mutation: () => Promise<T>,
  jobPostIdFromResult: (result: T) => string | null | undefined,
  synchronize: (jobPostId: string) => Promise<unknown>,
) {
  const result = await mutation();
  const jobPostId = jobPostIdFromResult(result);
  if (jobPostId) {
    try {
      await synchronize(jobPostId);
    } catch (error) {
      console.error("Job embedding synchronization threw unexpectedly", {
        jobPostId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  return result;
}
