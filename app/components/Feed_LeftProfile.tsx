"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LeftProfilePropTypes } from "@/types/FeedPagePropTypes";
import { PROFILE_PAGE_PATH } from "@/lib/constants";

export default function LeftProfile({ user, loading }: LeftProfilePropTypes) {
  const router = useRouter();
  
  if (loading) {
    return (
      <div className="lg:col-span-3 md:col-span-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20 w-full md:w-auto self-start">
          <div className="h-24 bg-gray-200 animate-pulse"></div>
          <div className="p-4 -mt-12">
            <div className="relative w-20 h-20 mb-3 bg-gray-300 rounded-full animate-pulse border-4 border-white"></div>
            <div className="h-6 bg-gray-300 rounded w-3/4 mb-3 animate-pulse"></div>
            <div className="h-4 bg-gray-300 rounded w-full mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-300 rounded w-5/6 mb-2 animate-pulse"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lg:col-span-3 md:col-span-4 flex justify-center md:justify-start">
      <div className="bg-white md:rounded-lg border border-gray-200 overflow-hidden sticky top-20 w-full md:w-auto md:max-w-xs self-start">
        <div className="hidden md:block h-24 bg-gray-200"></div>
        <div className="flex flex-row gap-6 md:gap-0 md:flex-col p-4 md:-mt-12">
          <div
            onClick={() => router.push(`/profile/${user.slug}`)}


            className="relative w-20 h-20 mb-3 cursor-pointer transition-transform duration-200 active:scale-95 hover:scale-105"
          >
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="rounded-full border-4 border-white object-cover"
            />
          </div>
          <div
            onClick={() => router.push(`/profile/${user.slug}`)}

            className="cursor-pointer transition-all duration-200"
          >
            <h2 className="font-bold text-gray-900 text-lg hover:text-red-500 transition-colors">
              {user.name}
            </h2>
            <p className="text-sm text-gray-600 mb-1">{user.title}</p>
            <p className="text-xs text-gray-500 mb-1">{user.education}</p>
            <p className="text-xs text-gray-500">{user.location}</p>
          </div>
        </div>
      </div>
    </div>
  );
}