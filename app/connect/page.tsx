"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { useRouter } from "next/navigation";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";

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

function RequestAvatar({
  profilePic,
  username,
}: {
  profilePic?: string;
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

  const router = useRouter();

  useEffect(() => {
    let ignore = false;

    async function loadIncoming() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          // TODO: all api paths should be in the constants file
          "/api/connect/v1/connect/requests?type=incoming",
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

    loadIncoming();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleDecline(requestId: string) {
    try {
      setError(null);
      setActingId(requestId);

      const res = await fetch(
          // TODO: all api paths should be in the constants file
        `/api/connect/v1/connect/request/${requestId}/decline`,
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
        `/api/connect/v1/connect/request/${requestId}/accept`,
        { method: "POST", credentials: "include" },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to accept request");

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
            <div className="py-20 text-center lg:translate-x-10">
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
      </div>
    </div>
  );
}
