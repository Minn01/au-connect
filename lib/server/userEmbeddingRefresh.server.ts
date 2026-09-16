import "server-only";

const EMBEDDING_REFRESH_TIMEOUT_MS = 3_000;

export type UserEmbeddingRefreshResult =
  | { success: true; status: 202 }
  | {
      success: false;
      reason: "configuration" | "network" | "timeout" | "unexpected-status";
      status?: number;
    };

function embeddingRefreshUrl(baseUrl: string, userId: string): URL | null {
  try {
    const url = new URL(baseUrl);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.pathname = `${url.pathname.replace(/\/+$/, "")}/internal/users/${encodeURIComponent(userId)}/embedding`;
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

/**
 * Ask the recommendation service to refresh one user's embedding.
 *
 * The result intentionally contains no configuration values so callers can
 * safely log or inspect it.
 */
export async function requestUserEmbeddingRefresh(
  userId: string,
): Promise<UserEmbeddingRefreshResult> {
  const baseUrl = process.env.RECOMMENDATION_SERVICE_URL;
  const internalApiKey = process.env.RECOMMENDATION_SERVICE_API_KEY;

  if (!baseUrl || !internalApiKey) {
    console.error(
      "Embedding refresh was not scheduled: RECOMMENDATION_SERVICE_URL and RECOMMENDATION_SERVICE_API_KEY must be configured.",
    );
    return { success: false, reason: "configuration" };
  }

  const url = embeddingRefreshUrl(baseUrl, userId);
  if (!url) {
    console.error(
      "Embedding refresh was not scheduled: RECOMMENDATION_SERVICE_URL must be a valid HTTP(S) URL without credentials.",
    );
    return { success: false, reason: "configuration" };
  }

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "x-internal-service-key": internalApiKey,
      },
      signal: AbortSignal.timeout(EMBEDDING_REFRESH_TIMEOUT_MS),
    });

    if (response.status === 202) {
      return { success: true, status: 202 };
    }

    console.error(
      `Embedding refresh was not accepted for user ${userId}: recommendation service returned HTTP ${response.status}.`,
    );
    return {
      success: false,
      reason: "unexpected-status",
      status: response.status,
    };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    console.error(
      timedOut
        ? `Embedding refresh timed out for user ${userId}.`
        : `Embedding refresh request failed for user ${userId}.`,
    );
    return { success: false, reason: timedOut ? "timeout" : "network" };
  }
}
