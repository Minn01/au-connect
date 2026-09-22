"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  Loader2,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import Post from "@/app/components/Post";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import {
  COMMUNITIES_API_PATH,
  FOLLOW_COMMUNITY_API_PATH,
  POST_API_PATH,
} from "@/lib/constants";
import { fetchUser } from "@/app/(main)/profile/utils/fetchfunctions";
import { setInvalidatePosts } from "@/lib/services/uploadService";
import { useActorStore } from "@/lib/stores/actorStore";
import type PostType from "@/types/Post";

type Community = {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  location: string | null;
  profilePic: string | null;
  coverPhoto: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isFollowing: boolean;
  _count: {
    followers: number;
    posts: number;
  };
};

type CommunitiesResponse = {
  communities: Community[];
  followedCommunities: Community[];
  availableCommunities: Community[];
};

type PostsResponse = {
  posts: PostType[];
  nextCursor: string | null;
};

function CommunityAvatar({
  community,
  size = 44,
}: {
  community: Pick<Community, "name" | "profilePic">;
  size?: number;
}) {
  const resolvedUrl = useResolvedMediaUrl(
    community.profilePic,
    "/default_profile.jpg",
  );

  return (
    <Image
      src={resolvedUrl}
      alt={community.name}
      width={size}
      height={size}
      className="rounded-lg object-cover"
    />
  );
}

function SidebarCommunityButton({
  community,
  active,
  onClick,
}: {
  community: Community;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
        active
          ? "bg-red-50 text-red-700 ring-1 ring-red-100"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <CommunityAvatar community={community} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{community.name}</p>
        <p className="text-xs text-slate-500">
          {community._count.posts} posts
        </p>
      </div>
    </button>
  );
}

export default function CommunityPage() {
  const [query, setQuery] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const [mobileSection, setMobileSection] = useState<"followed" | "available">(
    "followed",
  );
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const selectedActor = useActorStore((state) => state.selectedActor);
  const canFollowCommunities = selectedActor.type === "USER";

  useEffect(() => {
    setInvalidatePosts(() => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    });
  }, [queryClient]);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const { data: communitiesData, isLoading: communitiesLoading } =
    useQuery<CommunitiesResponse>({
      queryKey: ["communities"],
      queryFn: async () => {
        const res = await fetch(COMMUNITIES_API_PATH, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch communities");
        return res.json();
      },
    });

  const followedCommunities = useMemo(
    () => communitiesData?.followedCommunities ?? [],
    [communitiesData?.followedCommunities],
  );
  const availableCommunities = useMemo(
    () => communitiesData?.availableCommunities ?? [],
    [communitiesData?.availableCommunities],
  );
  const allCommunities = useMemo(
    () => communitiesData?.communities ?? [],
    [communitiesData?.communities],
  );
  const selectedCommunity = selectedCommunityId
    ? allCommunities.find((community) => community.id === selectedCommunityId)
    : null;
  const selectedCommunityCoverUrl = useResolvedMediaUrl(
    selectedCommunity?.coverPhoto,
    "/default_cover.jpg",
  );

  const filteredFollowed = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return followedCommunities;
    return followedCommunities.filter((community) =>
      community.name.toLowerCase().includes(normalized),
    );
  }, [followedCommunities, query]);

  const filteredAvailable = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableCommunities;
    return availableCommunities.filter((community) =>
      community.name.toLowerCase().includes(normalized),
    );
  }, [availableCommunities, query]);
  const mobileCommunities =
    mobileSection === "followed" ? filteredFollowed : filteredAvailable;
  const visibleMobileCommunities = mobileCommunities.slice(0, 1);

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsResponse>({
    queryKey: ["community-posts", selectedCommunityId, selectedActor],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ feed: "community" });
      params.set("actorType", selectedActor.type);
      if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
        params.set("actorCommunityId", selectedActor.communityId);
      }
      if (typeof pageParam === "string" && pageParam) {
        params.set("cursor", pageParam);
      }
      if (selectedCommunityId) {
        params.set("communityId", selectedCommunityId);
      }

      const res = await fetch(`${POST_API_PATH}?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch community posts");
      return res.json();
    },
    enabled: !!user,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || !hasNextPage || isFetchingNextPage) return;
        fetchNextPage();
      },
      { rootMargin: "800px", threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, selectedCommunityId]);

  async function toggleFollow(community: Community) {
    const res = await fetch(FOLLOW_COMMUNITY_API_PATH(community.id), {
      method: community.isFollowing ? "DELETE" : "POST",
      credentials: "include",
    });

    if (!res.ok) return;

    await queryClient.invalidateQueries({ queryKey: ["communities"] });
  }

  function openCommunityPage(community: Community) {
    router.push(`/community/${community.slug}`);
  }

  function selectCommunity(community: Community) {
    setSelectedCommunityId(community.id);
    setMobilePickerOpen(false);
  }

  return (
    <div className="min-h-full bg-slate-100 lg:h-[calc(100vh-73px)] lg:overflow-hidden">
      <div className="mx-auto grid min-h-full w-full max-w-7xl min-w-0 px-3 sm:px-4 lg:h-full lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-slate-200 bg-white lg:h-full lg:overflow-hidden lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-3 sm:p-4 lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
                  Community
                </h1>
                <p className="mt-1 text-xs text-slate-500 lg:hidden">
                  Follow pages and catch up on campus groups.
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                <UsersRound className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-3 hidden sm:mt-4 lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search communities"
                className="h-11 w-full rounded-full border border-slate-200 bg-slate-100 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-50"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedCommunityId(null)}
              className={`mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition sm:mt-5 ${
                !selectedCommunityId
                  ? "bg-red-50 text-red-700 ring-1 ring-red-100"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Your feed</p>
                <p className="text-xs text-slate-500">Recent activity</p>
              </div>
            </button>

            <div className="mt-4 border-t border-slate-200 pt-4 sm:mt-5 lg:hidden">
              <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSection("followed");
                    setMobilePickerOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    mobileSection === "followed"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Followed
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSection("available");
                    setMobilePickerOpen(false);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    mobileSection === "available"
                      ? "bg-white text-red-600 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  Discover
                </button>
              </div>

              {communitiesLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                </div>
              ) : visibleMobileCommunities.length ? (
                <div className="mt-3 space-y-2">
                  {visibleMobileCommunities.map((community) => (
                    <div
                      key={community.id}
                      className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white p-3 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md sm:gap-3 ${
                        selectedCommunityId === community.id
                          ? "border-red-100 bg-red-50"
                          : "border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectCommunity(community)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
                      >
                        <CommunityAvatar community={community} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {community.name}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {mobileSection === "followed"
                              ? `${community._count.posts} posts`
                              : `${community._count.followers} followers`}
                          </span>
                        </span>
                      </button>

                      {mobileSection === "followed" ? (
                        <button
                          type="button"
                          onClick={() => toggleFollow(community)}
                          className="shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          Unfollow
                        </button>
                      ) : (
                        canFollowCommunities && (
                          <button
                            type="button"
                            onClick={() => toggleFollow(community)}
                            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-red-50 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Follow
                          </button>
                        )
                      )}
                    </div>
                  ))}

                  {mobileCommunities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMobilePickerOpen(true)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md"
                    >
                      See more
                    </button>
                  )}
                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400">
                  {mobileSection === "followed"
                    ? "No followed communities."
                    : "No available communities."}
                </p>
              )}
            </div>

	            <div className="mt-4 hidden border-t border-slate-200 pt-4 sm:mt-5 lg:block">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-950">
                  Followed communities
                </h2>
                <span className="text-xs text-slate-400">
                  {followedCommunities.length}
                </span>
              </div>

              {communitiesLoading ? (
                <div className="flex h-20 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-red-500" />
                </div>
	              ) : filteredFollowed.length ? (
	                <div className="space-y-1">
	                  {filteredFollowed.map((community) => (
                    <div
                      key={community.id}
                      className="flex w-64 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white pr-2 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md lg:w-auto"
                    >
                      <div className="min-w-0 flex-1">
                        <SidebarCommunityButton
                          community={community}
                          active={selectedCommunityId === community.id}
                          onClick={() => setSelectedCommunityId(community.id)}
                        />
	                </div>
                      {canFollowCommunities && (
                        <button
                          type="button"
                          onClick={() => toggleFollow(community)}
                          className="h-8 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        >
                          Unfollow
                        </button>
                      )}
                    </div>
                  ))}
	                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400">
                  No followed communities.
                </p>
              )}
            </div>

	            <div className="mt-4 hidden border-t border-slate-200 pt-4 sm:mt-5 lg:block">
	              <div className="mb-2 flex items-center justify-between">
	                <h2 className="text-sm font-bold text-slate-950">
	                  Available communities
	                </h2>
	                <span className="text-xs text-slate-400">
	                  {availableCommunities.length}
	                </span>
	              </div>

	              {filteredAvailable.length ? (
	                <div className="space-y-2">
	                  {filteredAvailable.map((community) => (
                    <div
                      key={community.id}
                      className="w-64 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md lg:w-auto"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCommunityId(community.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <CommunityAvatar community={community} size={40} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {community.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {community._count.followers} followers
                            </p>
	                </div>
                        </button>
                        {canFollowCommunities && (
                          <button
                            type="button"
                            onClick={() => toggleFollow(community)}
                            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-red-50 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Follow
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
	                </div>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-400">
                  No available communities.
                </p>
              )}
            </div>
          </div>
        </aside>

        <main className="min-w-0 py-4 pl-0 sm:py-6 lg:h-full lg:overflow-y-auto lg:pl-4">
          <div className="mx-auto w-full max-w-3xl min-w-0">
            <div
              role={selectedCommunity ? "button" : undefined}
              tabIndex={selectedCommunity ? 0 : undefined}
              onClick={() => {
                if (selectedCommunity) openCommunityPage(selectedCommunity);
              }}
              onKeyDown={(event) => {
                if (
                  selectedCommunity &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  openCommunityPage(selectedCommunity);
                }
              }}
              className={`mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${
                selectedCommunity
                  ? "cursor-pointer transition hover:border-red-200 hover:shadow-md"
                  : ""
              }`}
            >
              {selectedCommunity?.coverPhoto && (
                <div className="relative h-24 bg-slate-200 sm:h-32">
                  <Image
                    src={selectedCommunityCoverUrl}
                    alt={selectedCommunity.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
                {selectedCommunity ? (
                  <CommunityAvatar community={selectedCommunity} size={48} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Bell className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
                    {selectedCommunity?.name ?? "Recent activity"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    {selectedCommunity
                      ? "Posts from this community page"
                      : "Posts from all communities"}
                  </p>
                  {selectedCommunity?.about && (
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                      {selectedCommunity.about}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {postsLoading ? (
              <div className="min-w-0 space-y-4">
                <Post isLoading={true} />
                <Post isLoading={true} />
              </div>
            ) : posts.length ? (
              <div className="min-w-0 space-y-4">
                {posts.map((post) => (
                  <Post
                    key={post.id}
                    user={user}
                    post={post}
                    isLoading={false}
                  />
                ))}

                {hasNextPage && (
                  <div
                    ref={loadMoreRef}
                    className="flex h-14 items-center justify-center text-sm text-slate-500"
                  >
                    {isFetchingNextPage && "Loading more posts..."}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-center sm:p-10">
                <UsersRound className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No community posts yet.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
      {mobilePickerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setMobilePickerOpen(false)}
        >
          <div
            className="max-h-[82vh] w-full max-w-md min-w-0 overflow-hidden rounded-2xl bg-white text-slate-950 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {mobileSection === "followed"
                      ? "Followed communities"
                      : "Discover communities"}
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">
                    {mobileCommunities.length} communities
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePickerOpen(false)}
                  className="rounded-md p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                  aria-label="Close communities"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-200" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search communities"
                  className="h-10 w-full rounded-full border border-white/30 bg-white/15 pl-10 pr-3 text-sm text-white outline-none placeholder:text-blue-100 focus:border-white focus:bg-white/20"
                />
              </div>
            </div>

            <div className="max-h-[calc(82vh-9.75rem)] space-y-2 overflow-y-auto p-4">
              {mobileCommunities.length ? (
                mobileCommunities.map((community) => (
                  <div
                    key={community.id}
                    className={`flex min-w-0 items-center gap-2 rounded-lg border bg-white p-3 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-md sm:gap-3 ${
                      selectedCommunityId === community.id
                        ? "border-red-100 bg-red-50"
                        : "border-slate-200"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectCommunity(community)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
                    >
                      <CommunityAvatar community={community} size={42} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {community.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {mobileSection === "followed"
                            ? `${community._count.posts} posts`
                            : `${community._count.followers} followers`}
                        </span>
                      </span>
                    </button>

                    {mobileSection === "followed" && canFollowCommunities && (
                      <button
                        type="button"
                        onClick={() => toggleFollow(community)}
                        className="h-8 shrink-0 rounded-md px-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-600"
                      >
                        Unfollow
                      </button>
                    )}

                    {mobileSection === "available" && canFollowCommunities && (
                      <button
                        type="button"
                        onClick={() => toggleFollow(community)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-red-50 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Follow
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">
                  No communities found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
