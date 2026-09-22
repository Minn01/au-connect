"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useRouter } from "next/navigation";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import {
  BASE_API_PATH,
  CONNECTION_RECOMMENDATIONS_API_PATH,
  CONNECTION_REQUEST_API_PATH,
} from "@/lib/constants";
import VerificationRequiredModal from "@/app/components/VerificationRequiredModal";

type IncomingRequest = {
  id: string;
  fromUserId: string;
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    title?: string;
    profilePic?: string;
    location?: string;
  };
};

type RecommendedUser = {
  id: string;
  username: string;
  title: string | null;
  profilePic: string | null;
  location: string | null;
};

type ConnectionRecommendation = {
  user: RecommendedUser;
  score: number;
};

type RecommendationStatus = "requested" | "connected";

const RECOMMENDATION_PAGE_SIZE = 10;

function RequestAvatar({
  profilePic,
  username,
}: {
  profilePic?: string | null;
  username?: string;
}) {
  const avatarUrl = useResolvedMediaUrl(profilePic, "/default_profile.jpg");

  return (
    <Image
      src={avatarUrl}
      alt={username || "User"}
      fill
      className="object-cover"
    />
  );
}

export default function ConnectPage() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<
    ConnectionRecommendation[]
  >([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsUnavailable, setRecommendationsUnavailable] =
    useState(false);
  const [recommendationsLoadingMore, setRecommendationsLoadingMore] =
    useState(false);
  const [recommendationsError, setRecommendationsError] = useState<
    string | null
  >(null);
  const [recommendationsNextCursor, setRecommendationsNextCursor] = useState<
    string | null
  >(null);
  const [recommendationsHasMore, setRecommendationsHasMore] = useState(false);
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
  const [recommendationStatuses, setRecommendationStatuses] = useState<
    Record<string, RecommendationStatus>
  >({});
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationAction, setVerificationAction] = useState("do this");

  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    async function loadIncoming() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          // TODO: all api paths should be in the constants file
          BASE_API_PATH + "/connect/requests?type=incoming",
          { credentials: "include" },
        );

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load requests");

        if (!ignore) setRequests(json.data || []);
      } catch (e: unknown) {
        if (!ignore) {
          setError(e instanceof Error ? e.message : "Server error");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    async function loadRecommendations() {
      try {
        setRecommendationsLoading(true);
        setRecommendationsError(null);

        const res = await fetch(
          `${CONNECTION_RECOMMENDATIONS_API_PATH}?limit=${RECOMMENDATION_PAGE_SIZE}`,
          { credentials: "include" },
        );
        const json = await res.json();

        if (!res.ok || json?.success !== true) {
          throw new Error(
            json?.error || "Failed to load connection recommendations",
          );
        }

        if (!ignore) {
          setRecommendationsUnavailable(false);
          setRecommendations(json?.data?.recommendations || []);
          setRecommendationsNextCursor(json?.data?.nextCursor ?? null);
          setRecommendationsHasMore(json?.data?.hasMore === true);
        }
      } catch (e: unknown) {
        if (!ignore) {
          console.warn(
            "Connection recommendations are unavailable; hiding the section.",
            e instanceof Error ? e.message : "Unknown recommendation error",
          );
          setRecommendationsUnavailable(true);
          setRecommendations([]);
          setRecommendationsNextCursor(null);
          setRecommendationsHasMore(false);
        }
      } finally {
        if (!ignore) setRecommendationsLoading(false);
      }
    }

    void loadIncoming();
    void loadRecommendations();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleLoadMoreRecommendations() {
    if (!recommendationsNextCursor || recommendationsLoadingMore) return;

    try {
      setRecommendationsLoadingMore(true);
      setRecommendationsError(null);

      const params = new URLSearchParams({
        limit: String(RECOMMENDATION_PAGE_SIZE),
        cursor: recommendationsNextCursor,
      });
      const res = await fetch(
        `${CONNECTION_RECOMMENDATIONS_API_PATH}?${params.toString()}`,
        { credentials: "include" },
      );
      const json = await res.json();

      if (!res.ok || json?.success !== true) {
        throw new Error(
          json?.error || "Failed to load more connection recommendations",
        );
      }

      const nextRecommendations: ConnectionRecommendation[] =
        json?.data?.recommendations || [];
      setRecommendations((current) => {
        const existingIds = new Set(current.map(({ user }) => user.id));
        return [
          ...current,
          ...nextRecommendations.filter(({ user }) => !existingIds.has(user.id)),
        ];
      });
      setRecommendationsNextCursor(json?.data?.nextCursor ?? null);
      setRecommendationsHasMore(json?.data?.hasMore === true);
    } catch (e: unknown) {
      console.warn(
        "Connection recommendations became unavailable; hiding the section.",
        e instanceof Error ? e.message : "Unknown recommendation error",
      );
      setRecommendationsUnavailable(true);
      setRecommendationsError(null);
    } finally {
      setRecommendationsLoadingMore(false);
    }
  }

  async function handleRecommendedConnect(toUserId: string) {
    try {
      setRecommendationsError(null);
      setConnectingUserId(toUserId);

      const res = await fetch(CONNECTION_REQUEST_API_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json?.requiresVerification) {
          setVerificationAction("send connection requests");
          setVerificationModalOpen(true);
          return;
        }
        throw new Error(json?.error || "Failed to send connection request");
      }

      setRecommendationStatuses((current) => ({
        ...current,
        [toUserId]: json?.autoAccepted ? "connected" : "requested",
      }));
    } catch (e: unknown) {
      setRecommendationsError(
        e instanceof Error ? e.message : "Failed to send connection request",
      );
    } finally {
      setConnectingUserId(null);
    }
  }

  async function handleDecline(requestId: string) {
    try {
      setError(null);
      setActingId(requestId);

      const res = await fetch(
          // TODO: all api paths should be in the constants file
        `${BASE_API_PATH}/connect/request/${requestId}/decline`,
        { method: "POST", credentials: "include" },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to decline request");

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Server error");
    } finally {
      setActingId(null);
    }
  }

  async function handleAccept(requestId: string) {
    try {
      setError(null);
      setActingId(requestId);

      const res = await fetch(
          // TODO: all api paths should be in the constants file
        `${BASE_API_PATH}/connect/request/${requestId}/accept`,
        { method: "POST", credentials: "include" },
      );

      const json = await res.json();
      if (!res.ok) {
        if (json?.requiresVerification) {
          setVerificationAction("accept connection requests");
          setVerificationModalOpen(true);
          return;
        }
        throw new Error(json?.error || "Failed to accept request");
      }

      //  pop out from connects page

      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Server error");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto h-full overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">
        <section className="w-full">
          <div className="mb-4 flex items-center gap-3 sm:mb-6">
            <h2 className="text-base font-bold text-neutral-800 sm:text-lg">
              Connect Requests
            </h2>

            {requests.length > 0 && (
              <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 sm:px-3">
                {requests.length} new
              </span>
            )}
          </div>

          {loading && (
            <p className="text-neutral-500 text-sm">Loading requests...</p>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          {!loading && !error && requests.length === 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-white py-10 text-center">
              <h3 className="text-lg font-semibold text-neutral-800">
                No connection requests
              </h3>
              <p className="text-sm text-neutral-500 mt-2">
                When someone sends you a connection request, it will appear
                here.
              </p>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {requests.map((req) => {
              const u = req.fromUser;

              return (
                <div
                  key={req.id}
                  className="group relative overflow-hidden rounded-lg border border-neutral-200/70 bg-white p-4 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md sm:rounded-2xl sm:bg-linear-to-br sm:from-neutral-50 sm:to-neutral-100/50 sm:p-6 lg:hover:scale-[1.02] lg:hover:shadow-xl"
                >
                  <div className="flex flex-col justify-between gap-3 sm:gap-4 lg:flex-row lg:items-center">
                    {/* LEFT — clickable profile */}
                    <div
                      className="flex min-w-0 cursor-pointer items-center gap-3 hover:opacity-90 sm:gap-4"
                      onClick={() => {
                        if (!u?.id) return;
                        const slug = buildSlug(u.username || "", u.id);
                        router.push(`/profile/${slug}`);
                      }}
                    >
                      <div className="relative shrink-0">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl ring-1 ring-neutral-200 transition-all group-hover:ring-blue-400 sm:h-20 sm:w-20 sm:rounded-2xl sm:ring-2">
                          <RequestAvatar
                            profilePic={u?.profilePic}
                            username={u?.username}
                          />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-500 sm:-bottom-1 sm:-right-1 sm:h-6 sm:w-6 sm:border-4" />
                      </div>

                      <div className="min-w-0 space-y-0.5 text-sm sm:space-y-1">
                        <div className="truncate text-sm font-bold text-neutral-900 hover:underline sm:text-base">
                          {u?.username || "Unknown user"}
                        </div>
                        <div className="truncate text-xs font-medium text-neutral-600 sm:text-sm">
                          {u?.title || "AU Member"}
                        </div>
                        {u?.location && (
                          <div className="truncate text-xs text-neutral-500">
                            {u.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT — actions */}
                    <div className="ml-[3.75rem] flex items-center justify-end gap-2 sm:ml-0 sm:w-auto sm:gap-3 lg:ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(req.id);
                        }}
                        disabled={actingId === req.id}
                        className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200 disabled:opacity-60 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm lg:px-6"
                      >
                        {actingId === req.id ? "Accepting..." : "Accept"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDecline(req.id);
                        }}
                        disabled={actingId === req.id}
                        className="rounded-lg bg-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-300 disabled:opacity-60 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm lg:px-6"
                      >
                        {actingId === req.id ? "Declining..." : "Decline"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {!recommendationsUnavailable && (
          <section className="mt-10 pb-8">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-neutral-800">
                People you may know
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Members with experience and interests similar to yours.
              </p>
            </div>

          {recommendationsError && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {recommendationsError}
            </p>
          )}

          {recommendationsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="h-80 animate-pulse rounded-2xl border border-neutral-200 bg-white shadow-sm"
                />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {recommendations.map(({ user }) => {
                  const status = recommendationStatuses[user.id];
                  const connecting = connectingUserId === user.id;
                  const buttonLabel = connecting
                    ? "Sending..."
                    : status === "connected"
                      ? "Connected"
                      : status === "requested"
                        ? "Requested"
                        : "Connect";

                  return (
                    <article
                      key={user.id}
                      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/profile/${buildSlug(user.username, user.id)}`,
                          )
                        }
                        className="relative aspect-4/3 w-full overflow-hidden bg-neutral-100"
                        aria-label={`View ${user.username}'s profile`}
                      >
                        <RequestAvatar
                          profilePic={user.profilePic}
                          username={user.username}
                        />
                      </button>

                      <div className="flex flex-1 flex-col p-4">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/profile/${buildSlug(user.username, user.id)}`,
                            )
                          }
                          className="min-w-0 text-left"
                        >
                          <h3 className="truncate font-semibold text-neutral-900 hover:underline">
                            {user.username}
                          </h3>
                        </button>
                        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-neutral-600">
                          {user.title || "AU Member"}
                        </p>
                        {user.location && (
                          <p className="mt-1 truncate text-xs text-neutral-400">
                            {user.location}
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRecommendedConnect(user.id)}
                          disabled={Boolean(status) || connecting}
                          className="mt-auto w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-default disabled:bg-blue-100 disabled:text-blue-700"
                        >
                          {buttonLabel}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {recommendationsHasMore && recommendationsNextCursor && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMoreRecommendations}
                    disabled={recommendationsLoadingMore}
                    className="rounded-xl border border-blue-200 bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    {recommendationsLoadingMore
                      ? "Loading more..."
                      : "Show more"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white py-10 text-center">
              <p className="text-sm text-neutral-500">
                No new connection recommendations right now.
              </p>
            </div>
          )}
          </section>
        )}
      </div>

      <VerificationRequiredModal
        open={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        action={verificationAction}
      />
    </div>
  );
}
