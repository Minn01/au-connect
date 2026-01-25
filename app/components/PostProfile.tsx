"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

import PostType from "@/types/Post";
import parseDate from "../profile/utils/parseDate";
import { buildSlug } from "../profile/utils/buildSlug";
import { useResolvedMediaUrl } from "@/app/profile/utils/useResolvedMediaUrl";

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";

export default function PostProfile({ post }: { post: PostType }) {
  const router = useRouter();
  const slug = buildSlug(post.username || "", post.userId || "");

  const resolvedProfilePicUrl = useResolvedMediaUrl(
    post.profilePic,
    DEFAULT_PROFILE_PIC
  );

  const handleProfileClick = (slug: string) => {
    if (!slug) return; // prevent runtime crash
    router.push(`/profile/${slug}`);
  };

  return (
    <div className="flex items-start gap-3 my-4 mx-5">
      <Image
        src={resolvedProfilePicUrl}
        width={50}
        height={50}
        alt={post.username ? post.username : "USER"}
        className="w-12 h-12 rounded-full object-cover"
      />

      <div className="flex-1">
        <h3
          onClick={() => handleProfileClick(slug)}
          className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 active:text-blue-700 hover:underline"
        >
          {post.username}
        </h3>
        {/* <h3 className="text-[10px] text-gray-900">{`${100} followers`}</h3> */}
        <p className="text-sm text-gray-500">
          {post.createdAt && parseDate(post.createdAt)}
        </p>
      </div>
    </div>
  );
}
