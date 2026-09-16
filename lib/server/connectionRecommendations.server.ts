import "server-only";

import prisma from "@/lib/prisma";

const RECOMMENDATION_TIMEOUT_MS = 3_000;

export type ConnectionRecommendation = {
  user: {
    id: string;
    username: string;
    title: string | null;
    profilePic: string | null;
    location: string | null;
  };
  score: number;
};

export type ConnectionRecommendationsResult =
  | {
      success: true;
      recommendations: ConnectionRecommendation[];
      nextCursor: string | null;
      hasMore: boolean;
    }
  | {
      success: false;
      reason: "configuration" | "request" | "response" | "database";
    };

function recommendationUrl(
  baseUrl: string,
  userId: string,
  limit: number,
  cursor: string | null,
) {
  try {
    const url = new URL(baseUrl);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.pathname = `${url.pathname.replace(/\/+$/, "")}/recommendations/connections/${encodeURIComponent(userId)}`;
    url.search = "";
    url.searchParams.set("limit", String(limit));
    if (cursor) url.searchParams.set("cursor", cursor);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function recommendationUserId(user: unknown): string | null {
  if (!user || typeof user !== "object" || Array.isArray(user)) return null;

  const record = user as Record<string, unknown>;
  const directId =
    stringValue(record.id) ??
    stringValue(record._id) ??
    stringValue(record.userId);

  if (directId) return directId;

  if (record._id && typeof record._id === "object") {
    return stringValue((record._id as Record<string, unknown>).$oid);
  }

  return null;
}

function isMongoObjectId(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

export async function getConnectionRecommendations(
  userId: string,
  limit: number,
  cursor: string | null = null,
  userStore: typeof prisma.user = prisma.user,
): Promise<ConnectionRecommendationsResult> {
  const baseUrl = process.env.RECOMMENDATION_SERVICE_URL;
  const serviceApiKey = process.env.RECOMMENDATION_SERVICE_API_KEY;

  if (!baseUrl || !serviceApiKey) {
    console.error(
      "Connection recommendations are unavailable: RECOMMENDATION_SERVICE_URL and RECOMMENDATION_SERVICE_API_KEY must be configured.",
    );
    return { success: false, reason: "configuration" };
  }

  const url = recommendationUrl(baseUrl, userId, limit, cursor);
  if (!url) {
    console.error(
      "Connection recommendations are unavailable: RECOMMENDATION_SERVICE_URL must be a valid HTTP(S) URL without credentials.",
    );
    return { success: false, reason: "configuration" };
  }

  let payload: unknown;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-internal-service-key": serviceApiKey,
      },
      signal: AbortSignal.timeout(RECOMMENDATION_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Connection recommendations request failed for user ${userId}: recommendation service returned HTTP ${response.status}.`,
      );
      return { success: false, reason: "request" };
    }

    payload = await response.json();
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    console.error(
      timedOut
        ? `Connection recommendations request timed out for user ${userId}.`
        : `Connection recommendations request failed for user ${userId}.`,
    );
    return { success: false, reason: "request" };
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    console.error(
      `Connection recommendations response was invalid for user ${userId}.`,
    );
    return { success: false, reason: "response" };
  }

  const envelope = payload as Record<string, unknown>;
  const data = envelope.data;
  if (
    envelope.success !== true ||
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray((data as Record<string, unknown>).recommendations)
  ) {
    console.error(
      `Connection recommendations response was invalid for user ${userId}.`,
    );
    return { success: false, reason: "response" };
  }

  const rawRecommendations = (data as Record<string, unknown>)
    .recommendations as unknown[];
  const nextCursor = (data as Record<string, unknown>).nextCursor;
  const hasMore = (data as Record<string, unknown>).hasMore;

  if (
    typeof hasMore !== "boolean" ||
    (nextCursor !== null && typeof nextCursor !== "string") ||
    (hasMore && (typeof nextCursor !== "string" || nextCursor.length === 0))
  ) {
    console.error(
      `Connection recommendations pagination was invalid for user ${userId}.`,
    );
    return { success: false, reason: "response" };
  }

  const candidateScores = new Map<string, number>();

  for (const recommendation of rawRecommendations) {
    if (
      !recommendation ||
      typeof recommendation !== "object" ||
      Array.isArray(recommendation)
    ) {
      continue;
    }

    const record = recommendation as Record<string, unknown>;
    const candidateId = recommendationUserId(record.user);
    if (
      !candidateId ||
      candidateId === userId ||
      !isMongoObjectId(candidateId) ||
      candidateScores.has(candidateId)
    ) {
      continue;
    }

    const score =
      typeof record.score === "number" && Number.isFinite(record.score)
        ? record.score
        : 0;
    candidateScores.set(candidateId, score);
  }

  const candidateIds = [...candidateScores.keys()].slice(0, limit);
  if (candidateIds.length === 0) {
    return { success: true, recommendations: [], nextCursor, hasMore };
  }

  try {
    const users = await userStore.findMany({
      where: { id: { in: candidateIds } },
      select: {
        id: true,
        username: true,
        title: true,
        profilePic: true,
        location: true,
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    return {
      success: true,
      recommendations: candidateIds.flatMap((candidateId) => {
        const user = usersById.get(candidateId);
        return user
          ? [{ user, score: candidateScores.get(candidateId) ?? 0 }]
          : [];
      }),
      nextCursor,
      hasMore,
    };
  } catch {
    console.error(
      `Connection recommendation profiles could not be loaded for user ${userId}.`,
    );
    return { success: false, reason: "database" };
  }
}
