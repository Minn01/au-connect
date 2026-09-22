"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import Post from "@/app/components/Post";
import CoverPhotoCropModal from "@/app/(main)/profile/components/CoverPhotoCropModal";
import ProfilePhotoCropModal from "@/app/(main)/profile/components/ProfilePhotoCropModal";
import SectionCard from "@/app/(main)/profile/components/SectionCard";
import { uploadFile } from "@/app/(main)/profile/utils/uploadMedia";
import { useResolvedMediaUrl } from "@/app/(main)/profile/utils/useResolvedMediaUrl";
import { fetchUser } from "@/app/(main)/profile/utils/fetchfunctions";
import {
  COMMUNITY_PROFILE_API_PATH,
  FOLLOW_COMMUNITY_API_PATH,
  POST_API_PATH,
} from "@/lib/constants";
import { useActorStore } from "@/lib/stores/actorStore";
import { ProfileCoverCrop } from "@/types/ProfileCoverCrop";
import { ProfilePicCrop } from "@/types/ProfilePicCrop";
import type PostType from "@/types/Post";

type CommunityProfile = {
  id: string;
  name: string;
  slug: string;
  about: string | null;
  location: string | null;
  profilePic: string | null;
  profilePicOriginal: string | null;
  profilePicCrop: ProfilePicCrop | null;
  coverPhoto: string | null;
  coverPhotoOriginal: string | null;
  coverPhotoCrop: ProfileCoverCrop | null;
  isManager: boolean;
  isFollowing: boolean;
  _count: {
    followers: number;
    posts: number;
    managers: number;
  };
};

type PostsResponse = {
  posts: PostType[];
  nextCursor: string | null;
};

type EditForm = {
  name: string;
  about: string;
  location: string;
};

type ImageTarget = "profilePic" | "coverPhoto";
type ImageMode = "upload" | "edit";

const MAX_PROFILE_BYTES = 5 * 1024 * 1024;
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isInternalImageBlobName(blobName?: string | null) {
  return !!blobName && blobName.startsWith("images/");
}

async function urlToLocalFile(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load image");

  const blob = await res.blob();
  const ext =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";

  const file = new File([blob], `edit-${crypto.randomUUID()}.${ext}`, {
    type: blob.type || "image/jpeg",
  });

  return { file, previewUrl: URL.createObjectURL(file) };
}

export default function CommunityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<ImageTarget | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const [profileCropOpen, setProfileCropOpen] = useState(false);
  const [coverCropOpen, setCoverCropOpen] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: "",
    about: "",
    location: "",
  });
  const selectedActor = useActorStore((state) => state.selectedActor);

  useEffect(() => {
    params.then((resolved) => setSlug(resolved.slug));
  }, [params]);

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: fetchUser,
  });

  const {
    data: community,
    isLoading: communityLoading,
    isError: communityIsError,
    error: communityError,
    refetch: refetchCommunity,
  } = useQuery<CommunityProfile>({
    queryKey: ["community-profile", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Missing slug");
      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch community");
      return json.community;
    },
    enabled: !!slug,
    retry: false,
  });

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PostsResponse>({
    queryKey: ["community-profile-posts", community?.id, selectedActor],
    queryFn: async ({ pageParam }) => {
      const search = new URLSearchParams({ feed: "community" });
      search.set("actorType", selectedActor.type);
      if (selectedActor.type === "COMMUNITY" && selectedActor.communityId) {
        search.set("actorCommunityId", selectedActor.communityId);
      }
      if (community?.id) search.set("communityId", community.id);
      if (typeof pageParam === "string" && pageParam) {
        search.set("cursor", pageParam);
      }
      const res = await fetch(`${POST_API_PATH}?${search.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch community posts");
      return res.json();
    },
    enabled: !!community?.id,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = postsData?.pages.flatMap((page) => page.posts) ?? [];
  const coverUrl = useResolvedMediaUrl(community?.coverPhoto, "/default_cover.jpg");
  const profileUrl = useResolvedMediaUrl(
    community?.profilePic,
    "/default_profile.jpg",
  );
  const profileOriginalUrl = useResolvedMediaUrl(
    community?.profilePicOriginal,
    profileUrl,
  );
  const coverOriginalUrl = useResolvedMediaUrl(
    community?.coverPhotoOriginal,
    coverUrl,
  );
  const actingAsThisCommunity =
    selectedActor.type === "COMMUNITY" &&
    !!community?.id &&
    selectedActor.communityId === community.id;
  const canManageThisCommunity = community?.isManager && actingAsThisCommunity;
  const canFollowCommunity = selectedActor.type === "USER";
  const hasProfilePhoto =
    !!community?.profilePic && community.profilePic !== "/default_profile.jpg";
  const hasCoverPhoto =
    !!community?.coverPhoto && community.coverPhoto !== "/default_cover.jpg";
  const canEditProfileOriginal = isInternalImageBlobName(
    community?.profilePicOriginal,
  );
  const canEditCoverOriginal = isInternalImageBlobName(
    community?.coverPhotoOriginal,
  );
  const communityActorPayload =
    canManageThisCommunity && community?.id
      ? {
          actorType: selectedActor.type,
          communityId: community.id,
        }
      : {};

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
  }, [community?.id, fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  function openEdit() {
    if (!community) return;
    setForm({
      name: community.name,
      about: community.about ?? "",
      location: community.location ?? "",
    });
    setMessage("");
    setEditing(true);
  }

  function resetImageSelection() {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedPreviewUrl(null);
    setSelectedFile(null);
    setProfileCropOpen(false);
    setCoverCropOpen(false);
    setImageMode("upload");
  }

  function closeImageModal() {
    if (saving) return;
    resetImageSelection();
    setImageModal(null);
  }

  function openImageModal(target: ImageTarget) {
    resetImageSelection();
    setMessage("");
    setImageModal(target);
  }

  function pickImage(target: ImageTarget) {
    setImageMode("upload");
    if (target === "profilePic") {
      profileInputRef.current?.click();
      return;
    }
    coverInputRef.current?.click();
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    target: ImageTarget,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("Only JPG, PNG, WEBP are allowed.");
      return;
    }
    if (
      (target === "profilePic" && file.size > MAX_PROFILE_BYTES) ||
      (target === "coverPhoto" && file.size > MAX_COVER_BYTES)
    ) {
      setMessage(
        target === "profilePic"
          ? "File too large. Max is 5MB."
          : "File too large. Max is 8MB.",
      );
      return;
    }

    resetImageSelection();
    setSelectedFile(file);
    setSelectedPreviewUrl(URL.createObjectURL(file));
    setImageMode("upload");
    if (target === "profilePic") {
      setProfileCropOpen(true);
    } else {
      setCoverCropOpen(true);
    }
  }

  async function editCurrentImage(target: ImageTarget) {
    if (!community) return;
    const canEdit =
      target === "profilePic" ? canEditProfileOriginal : canEditCoverOriginal;
    if (!canEdit) return;

    setSaving(true);
    try {
      const { file, previewUrl } = await urlToLocalFile(
        target === "profilePic" ? profileOriginalUrl : coverOriginalUrl,
      );
      resetImageSelection();
      setSelectedFile(file);
      setSelectedPreviewUrl(previewUrl);
      setImageMode("edit");
      if (target === "profilePic") {
        setProfileCropOpen(true);
      } else {
        setCoverCropOpen(true);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to edit image.");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfilePhoto(result: {
    croppedFile: File;
    profilePicCrop: ProfilePicCrop;
  }) {
    if (!slug || !community) return;
    setSaving(true);
    setMessage("");

    try {
      const croppedUpload = await uploadFile(result.croppedFile);
      let originalBlobName = community.profilePicOriginal;

      if (imageMode === "upload" || !originalBlobName) {
        if (!selectedFile) throw new Error("No file selected.");
        const originalUpload = await uploadFile(selectedFile);
        originalBlobName = originalUpload.blobName;
      }

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...communityActorPayload,
          profilePic: croppedUpload.blobName,
          profilePicOriginal: originalBlobName,
          profilePicCrop: result.profilePicCrop,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save profile photo");
      }

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveCoverPhoto(result: {
    croppedFile: File;
    coverPhotoCrop: ProfileCoverCrop;
  }) {
    if (!slug || !community) return;
    setSaving(true);
    setMessage("");

    try {
      const croppedUpload = await uploadFile(result.croppedFile);
      let originalBlobName = community.coverPhotoOriginal;

      if (imageMode === "upload" || !originalBlobName) {
        if (!selectedFile) throw new Error("No file selected.");
        const originalUpload = await uploadFile(selectedFile);
        originalBlobName = originalUpload.blobName;
      }

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...communityActorPayload,
          coverPhoto: croppedUpload.blobName,
          coverPhotoOriginal: originalBlobName,
          coverPhotoCrop: result.coverPhotoCrop,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save cover photo");
      }

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteImage(target: ImageTarget) {
    if (!slug) return;
    setSaving(true);
    setMessage("");

    try {
      const payload =
        target === "profilePic"
          ? {
              profilePic: null,
              profilePicOriginal: null,
              profilePicCrop: null,
            }
          : {
              coverPhoto: null,
              coverPhotoOriginal: null,
              coverPhotoCrop: null,
            };

      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...communityActorPayload, ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");

      resetImageSelection();
      setImageModal(null);
      await refreshCommunityIdentity();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setSaving(false);
    }
  }

  async function refreshCommunityIdentity() {
    await refetchCommunity();
    await queryClient.invalidateQueries({ queryKey: ["communities"] });
    await queryClient.invalidateQueries({ queryKey: ["managed-communities"] });
    await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["community-profile-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  async function saveCommunity() {
    if (!slug) return;
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        ...communityActorPayload,
        name: form.name,
        about: form.about,
        location: form.location,
      };
      const res = await fetch(COMMUNITY_PROFILE_API_PATH(slug), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update community");
      }

      setEditing(false);
      await refetchCommunity();
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
      await queryClient.invalidateQueries({ queryKey: ["managed-communities"] });
      await queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["community-profile-posts"] });
      setMessage("Community updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleFollow() {
    if (!community || followPending) return;

    setFollowPending(true);
    try {
      const res = await fetch(FOLLOW_COMMUNITY_API_PATH(community.id), {
        method: community.isFollowing ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!res.ok) return;
      await refetchCommunity();
      await queryClient.invalidateQueries({ queryKey: ["communities"] });
    } finally {
      setFollowPending(false);
    }
  }

  if (communityLoading) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-100">
        <Loader2 className="h-7 w-7 animate-spin text-red-500" />
      </div>
    );
  }

  if (communityIsError || !community) {
    const unavailableMessage =
      communityError instanceof Error
        ? communityError.message
        : "Community not found.";

    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-slate-100">
        <div className="mx-4 max-w-md rounded-lg border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            Community unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {unavailableMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-73px)] w-full min-w-0 overflow-x-clip bg-slate-100 pb-8">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-6">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[3/1] w-full bg-slate-200">
            <Image
              src={coverUrl}
              alt={community.name}
              fill
              className="object-cover"
            />
            {canManageThisCommunity && (
              <button
                type="button"
                onClick={() => openImageModal("coverPhoto")}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur-sm hover:bg-white"
                aria-label="Edit cover photo"
                title="Edit cover photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="relative min-w-0 p-4">
            <div className="flex min-w-0 items-start justify-between gap-3 md:block">
              <div className="relative z-10 -mt-16 h-32 w-32 shrink-0">
                <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                  <Image
                    src={profileUrl}
                    alt={community.name}
                    fill
                    className="object-cover"
                  />
                  {canManageThisCommunity && (
                    <button
                      type="button"
                      onClick={() => openImageModal("profilePic")}
                      className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-md hover:bg-white"
                      aria-label="Edit profile photo"
                      title="Edit profile photo"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="z-20 flex min-w-0 flex-1 flex-col items-end gap-2 md:absolute md:right-4 md:top-4 md:w-auto">
                <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:gap-3">
                  {canFollowCommunity && (
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={followPending}
                      aria-busy={followPending}
                      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-70 md:h-10 md:gap-2 md:px-4 md:text-sm ${
                        community.isFollowing
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {followPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      {followPending
                        ? community.isFollowing
                          ? "Unfollowing..."
                          : "Following..."
                        : community.isFollowing
                          ? "Unfollow"
                          : "Follow"}
                    </button>
                  )}
                  {selectedActor.type === "USER" && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/messages?communityId=${community.id}`)
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 md:h-10 md:gap-2 md:px-4 md:text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </button>
                  )}
                  {canManageThisCommunity && (
                    <button
                      type="button"
                      onClick={openEdit}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 md:h-10 md:gap-2 md:px-4 md:text-sm"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit details
                    </button>
                  )}
                </div>
              </div>
            </div>

            <h1 className="mt-2 break-words text-2xl font-bold text-slate-950">
              {community.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span>{community._count.followers} followers</span>
              <span>{community._count.posts} posts</span>
              {community.location && (
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <MapPin className="h-4 w-4" />
                  {community.location}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <main className="mx-auto mt-4 grid w-full min-w-0 max-w-5xl grid-cols-1 gap-4 px-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <SectionCard
            title="About"
            icon={
              canManageThisCommunity ? (
                <button
                  type="button"
                  onClick={openEdit}
                  className="rounded-full p-2 text-blue-600 hover:bg-blue-100"
                  aria-label="Edit community details"
                  title="Edit community details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              ) : undefined
            }
          >
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {community.about || "No community description yet."}
            </p>
          </SectionCard>

          <SectionCard
            title="Community"
            icon={<UsersRound className="h-5 w-5 text-purple-600" />}
          >
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UsersRound className="h-4 w-4" />
                </span>
                <span>
                  <strong className="font-semibold text-slate-950">
                    {community._count.managers}
                  </strong>{" "}
                  managers
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                  <UserPlus className="h-4 w-4" />
                </span>
                <span>
                  <strong className="font-semibold text-slate-950">
                    {community._count.followers}
                  </strong>{" "}
                  followers
                </span>
              </div>
            </div>
          </SectionCard>
        </aside>

        <section className="min-w-0 space-y-4">
          {message && (
            <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          {postsLoading ? (
            <>
              <Post isLoading={true} />
              <Post isLoading={true} />
            </>
          ) : posts.length ? (
            <>
              {posts.map((post) => (
                <Post
                  key={post.id}
                  user={user}
                  post={post}
                  isLoading={false}
                  disablePollVoting
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
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-slate-500">
                No posts from this community yet.
              </p>
            </div>
          )}
        </section>
      </main>

      {imageModal && canManageThisCommunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeImageModal}
          />
          <div className="relative z-10 max-h-[86vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-4 text-white">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {imageModal === "profilePic"
                    ? "Profile photo"
                    : "Cover photo"}
                </h2>
                <p className="text-sm text-blue-100">
                  Preview, upload, or crop this community image.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImageModal}
                disabled={saving}
                className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-50"
                aria-label="Close image editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div
                className={
                  imageModal === "profilePic"
                    ? "relative mx-auto mb-6 h-48 w-48 overflow-hidden rounded-full border border-slate-200"
                    : "relative mb-6 h-40 w-full overflow-hidden rounded-lg border border-slate-200"
                }
              >
                <Image
                  src={imageModal === "profilePic" ? profileUrl : coverUrl}
                  alt={community.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="space-y-3">
                {(imageModal === "profilePic"
                  ? hasProfilePhoto
                  : hasCoverPhoto) && (
                  <button
                    type="button"
                    onClick={() => editCurrentImage(imageModal)}
                    disabled={
                      saving ||
                      (imageModal === "profilePic"
                        ? !canEditProfileOriginal
                        : !canEditCoverOriginal)
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <Pencil className="h-4 w-4" />
                    {imageModal === "profilePic"
                      ? "Edit current photo"
                      : "Edit current cover"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => pickImage(imageModal)}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                >
                  {imageModal === "profilePic"
                    ? "Upload new photo"
                    : "Upload new cover"}
                </button>

                {(imageModal === "profilePic"
                  ? hasProfilePhoto
                  : hasCoverPhoto) && (
                  <button
                    type="button"
                    onClick={() => deleteImage(imageModal)}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {imageModal === "profilePic"
                      ? "Delete photo"
                      : "Remove cover"}
                  </button>
                )}
              </div>

              <input
                ref={profileInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(event) => handleImageChange(event, "profilePic")}
              />
              <input
                ref={coverInputRef}
                type="file"
                accept={ALLOWED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(event) => handleImageChange(event, "coverPhoto")}
              />
            </div>
          </div>

          <ProfilePhotoCropModal
            open={profileCropOpen}
            imageUrl={selectedPreviewUrl}
            initialCrop={community.profilePicCrop}
            busy={saving}
            onCancel={() => {
              if (!saving) resetImageSelection();
            }}
            onSave={saveProfilePhoto}
          />

          <CoverPhotoCropModal
            open={coverCropOpen}
            imageUrl={selectedPreviewUrl}
            initialCrop={community.coverPhotoCrop}
            busy={saving}
            onCancel={() => {
              if (!saving) resetImageSelection();
            }}
            onSave={saveCoverPhoto}
          />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 text-white">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Edit Community
                </h3>
                <p className="mt-1 text-sm text-blue-100">
                  Update this community&apos;s public profile details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={saving}
                className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-50"
                aria-label="Close edit community"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-4">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-900">
                    Name
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-900">
                    Location
                  </span>
                  <input
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-900">
                    About
                  </span>
                  <textarea
                    value={form.about}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        about: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCommunity}
                  disabled={saving}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
