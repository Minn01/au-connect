"use client";

import { useState } from "react";
import Image from "next/image";
import CreatePostModalPropTypes from "@/types/CreatePostModalPropTypes";

export default function CreatePostModal({
  isOpen,
  setIsOpen,
}: CreatePostModalPropTypes) {
  const [selectedVisibility, setSelectedVisibility] = useState("everyone");
  const [showDropdown, setShowDropdown] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const visibilityOptions = [
    {
      id: "everyone",
      label: "Everyone",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fillRule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      description: "Anyone on AU Connect",
    },
    {
      id: "friends",
      label: "Friends",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
      description: "Your connections only",
    },
    {
      id: "only-me",
      label: "Only Me",
      icon: (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      ),
      description: "Only visible to you",
    },
  ];

  const handleClose = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setPostContent("");
    setSelectedVisibility("everyone");
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const currentVisibility = visibilityOptions.find(
    (opt) => opt.id === selectedVisibility
  );

  // main function that talks to backend
  const handleSubmitPost = async () => {
  if (!postContent.trim() || isSubmitting) return;

  try {
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await fetch("/api/connect/v1/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: postContent,
        visibility: selectedVisibility,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create post");
    }

    // Reset UI on success
    setPostContent("");
    setSelectedVisibility("everyone");
    setIsOpen(false);
  } catch (err: unknown) {
    if (err instanceof Error) {
      setErrorMsg(err.message);
    } else {
      setErrorMsg("Something went wrong");
    }
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-neutral-100">
          {/* Avatar */}
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl overflow-hidden bg-linear-to-br from-white-400 to-white-500 p-0.5">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-white relative">
                <Image
                  src="/au-connect-logo.png"
                  alt="User"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          <div className="flex-1">
            <div className="text-base font-bold text-neutral-900">
              Thant Zin Min
            </div>

            {/* Visibility dropdown */}
            <div className="relative mt-2">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-linear-to-br from-neutral-50 to-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700 hover:from-neutral-100 hover:to-neutral-200 transition-all duration-200 hover:shadow-md"
              >
                {currentVisibility?.icon}
                {currentVisibility?.label}
                <svg
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSelectedVisibility(option.id);
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-linear-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 ${
                        selectedVisibility === option.id
                          ? "bg-linear-to-r from-blue-50 to-purple-50"
                          : ""
                      }`}
                    >
                      <div className="mt-0.5 text-neutral-600">
                        {option.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-semibold text-neutral-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {option.description}
                        </div>
                      </div>
                      {selectedVisibility === option.id && (
                        <svg
                          className="h-5 w-5 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="ml-2 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all duration-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Text area */}
        <div className="px-6 pt-4 pb-2">
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="w-full h-44 resize-none border-none outline-none text-base text-neutral-900 placeholder:text-neutral-400 leading-relaxed"
            placeholder="What's on your mind? Share your thoughts with the AU Connect community..."
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="px-6 text-sm text-red-500 pb-2">{errorMsg}</p>
        )}

        {/* Attachment row (unchanged) */}
        {/* ... keep your existing attachment buttons here ... */}

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-linear-to-br from-neutral-50 to-white">
          <div className="text-xs text-neutral-500">
            Posting to{" "}
            <span className="font-semibold text-neutral-700">AU Connect</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-all duration-200 hover:scale-105"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitPost}
              disabled={isSubmitting || !postContent.trim()}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all duration-300 ${
                postContent.trim() && !isSubmitting
                  ? "bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 hover:shadow-xl hover:scale-105"
                  : "bg-neutral-300 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
