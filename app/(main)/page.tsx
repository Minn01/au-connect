"use client";
import { useEffect } from "react";
import LeftProfile from "../components/Feed_LeftProfile";
import MainFeed from "../components/Feed_MainFeed";
import Image from "next/image";
import AnnouncementsSection from "../components/AnnouncementsSection";
import { asset } from "@/lib/basePath";
import { fetchPosts, fetchUser } from "./profile/utils/fetchfunctions";
import PostType from "@/types/Post";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { setInvalidatePosts } from "@/lib/services/uploadService";
import { useActorStore } from "@/lib/stores/actorStore";
import { MY_MANAGED_COMMUNITIES_API_PATH } from "@/lib/constants";

export default function Home() {
  // Get query client and pass to upload service
  const queryClient = useQueryClient();
  const selectedActor = useActorStore((state) => state.selectedActor);

  useEffect(() => {
    setInvalidatePosts(() => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    });
  }, [queryClient]);

  // USER
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const { data: managedCommunities = [] } = useQuery({
    queryKey: ["managed-communities"],
    queryFn: async () => {
      const res = await fetch(MY_MANAGED_COMMUNITIES_API_PATH);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.communities) ? json.communities : [];
    },
    enabled: !!user,
  });
  const activeCommunity =
    selectedActor.type === "COMMUNITY"
      ? managedCommunities.find(
          (community: { id: string }) =>
            community.id === selectedActor.communityId,
        )
      : null;

  // POSTS (infinite)
  const {
    data,
    isLoading: postLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", selectedActor],
    queryFn: fetchPosts,
    enabled: !!user,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // FLATTEN POSTS
  const posts: PostType[] = data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="h-full">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="md:grid md:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)] md:gap-6 lg:grid-cols-12">
          <div className="hidden min-w-0 md:block lg:col-span-3">
            <LeftProfile
              user={user}
              loading={userLoading}
              community={activeCommunity}
            />
          </div>

          <div className="min-w-0 lg:col-span-6">
            {user && (
              <MainFeed
                user={user}
                userLoading={userLoading}
                community={activeCommunity}
                posts={posts}
                loading={postLoading}
                fetchNextPage={fetchNextPage}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />
            )}
          </div>

          <div className="hidden min-w-0 lg:col-span-3 lg:block">
            <div className="sticky top-4">
              <div className="bg-white border-l-4 border-red-600 rounded-xl p-6 shadow-sm flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-serif italic text-neutral-900">
                    Labor Omnia Vincit
                  </h3>
                  <p className="text-sm text-neutral-600 mt-2">
                    Work conquers all things
                  </p>
                </div>

                {/* AU Logo */}
                <div className="shrink-0">
                  <div className="h-16 w-16 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center overflow-hidden">
                    <Image
                      src={asset("/au-logo.png")}
                      alt="Assumption University of Thailand"
                      width={64}
                      height={64}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>

              <AnnouncementsSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
