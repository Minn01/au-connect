"use client";

import { BookOpen, Image as ImageIcon, MessageSquare } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

import Post from "./Post";
import CreatePostModal from "./CreatePostModal";
import { MainFeedPropTypes } from "@/types/FeedPagePropTypes";

export default function MainFeed({ user, posts, loading }: MainFeedPropTypes) {
    const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
    const [selectedPostType, setSelectedPostType] = useState("discussion");

  return (
    <div className="lg:col-span-6 md:col-span-7 space-y-4">
      {/* CREATE POST */}
      <div className="bg-white md:rounded-lg border border-gray-200 p-4 pt-7">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-10 h-10">
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="rounded-full object-cover"
            />
          </div>
          <button 
          onClick={() => setIsCreatePostModalOpen(true)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none active:bg-gray-100 hover:bg-gray-200 text-left">
            {"Share your ideas"}
          </button>
        </div>

        <div className="flex justify-evenly gap-4 pl-13">
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <MessageSquare className="w-5 h-5" />
            <span>Discussion</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <ImageIcon className="w-5 h-5" />
            <span>Media</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-red-600">
            <BookOpen className="w-5 h-5" />
            <span>Write Article</span>
          </button>
        </div>
      </div>

      { isCreatePostModalOpen && (
        <CreatePostModal 
          isOpen={isCreatePostModalOpen} 
          setIsOpen={setIsCreatePostModalOpen} 
        />
      ) }

      {/* POSTS */}
      {loading ? (
        <>
          <Post isLoading={true} />
          <Post isLoading={true} />
        </>
      ) : (
        posts.map(
          (post) => post && <Post key={post.id} post={post} isLoading={false} />
        )
      )}
    </div>
  );
}