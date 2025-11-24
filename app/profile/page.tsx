"use client";
import Image from "next/image";

export default function UserProfilePage() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="w-full max-w-7xl mx-auto pt-32 px-4 lg:px-0">

        {/* ======================================================
            FULL WIDTH TOP PROFILE HEADER
        ======================================================= */}
        <div className="bg-white rounded-3xl shadow border border-zinc-300 overflow-hidden mb-6">

          {/* Cover */}
          <div className="relative w-full h-60 lg:h-72 bg-zinc-200">
            <button className="absolute top-4 right-4 bg-white border border-zinc-300 p-2 rounded-full shadow">
              📷
            </button>
          </div>

          {/* Profile Info */}
          <div className="relative px-6 pb-10">

            {/* Profile Image */}
            <div className="absolute left-6 -top-20">
              <Image
                src="/signUp.png"
                width={160}
                height={160}
                alt="Profile"
                className="rounded-full border-4 border-white object-cover shadow-md"
              />
            </div>

            <div className="pt-24 flex flex-col lg:flex-row lg:justify-between lg:items-end">

              {/* Info */}
              <div className="space-y-1">
                <p className="text-red-600 text-sm font-medium">15 connections</p>

                <h2 className="text-3xl font-semibold text-zinc-900">
                  Zai Swan <span className="text-zinc-500">(Alumni)</span>
                </h2>

                <p className="text-zinc-700">Game Developer</p>
                <p className="text-zinc-700">
                  Class 2015, School of Science & Technology
                </p>

                <p className="text-zinc-700">
                  Bangkok, Thailand{" "}
                  <span className="text-red-600 font-medium cursor-pointer">
                    Contact Info
                  </span>
                </p>
              </div>

              {/* Edit Button */}
              <button className="mt-4 lg:mt-0 border border-zinc-300 px-5 py-2 rounded-full text-sm flex items-center gap-2 text-zinc-700 hover:bg-zinc-100 transition">
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================
            TWO COLUMN LAYOUT — FACEBOOK STYLE
        ======================================================= */}
        <div className="flex flex-col lg:flex-row gap-8 relative">

          {/* LEFT COLUMN — scroll boundary */}
          <div className="w-full lg:w-1/3 relative">

            {/* STICKY WRAPPER — NO GAP */}
            <div className="lg:sticky lg:top-0">

              {/* LEFT CONTENT */}
              <div className="space-y-8 pb-10">

                {/* Current Job */}
                <div className="bg-white rounded-3xl shadow border border-zinc-300 p-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-semibold text-zinc-900">Current Job</h3>
                    <button className="border border-zinc-300 px-3 py-1 rounded-full text-xs text-zinc-600">
                      ✏️ Edit
                    </button>
                  </div>

                  <p className="mt-3 font-semibold text-zinc-900">Senior Programmer</p>
                  <p className="text-zinc-700">TENCENT COMPANY</p>
                  <p className="text-zinc-700">Mar 2020 – Present</p>
                </div>

                {/* About */}
                <div className="bg-white rounded-3xl shadow border border-zinc-300 p-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-semibold text-zinc-900">About</h3>
                    <button className="border border-zinc-300 px-3 py-1 rounded-full text-xs text-zinc-600">
                      ✏️ Edit
                    </button>
                  </div>

                  <p className="mt-3 text-zinc-700 leading-relaxed">
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                    A creative technology strategist with 12+ years of experience…
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Posts) */}
          <div className="w-full lg:w-2/3 space-y-6">

            {/* Posts Header */}
            <div className="bg-white rounded-3xl shadow border border-zinc-300 p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-semibold text-zinc-900">Posts</h3>
                <button className="border border-zinc-300 px-4 py-1 rounded-full text-sm text-zinc-700">
                  Create Post
                </button>
              </div>
            </div>

            {/* POST #1 */}
            <div className="bg-white rounded-3xl shadow border border-zinc-300 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/default-profile.jpg"
                  width={40}
                  height={40}
                  className="rounded-full"
                  alt="User"
                />
                <div>
                  <p className="font-semibold text-zinc-900">Zai Swan</p>
                  <p className="text-zinc-500 text-sm">
                    Class 2015, School of Science & Technology
                  </p>
                </div>
              </div>

              <p className="font-semibold text-zinc-900 mb-3">
                Back To My Graduation Days
              </p>

              <div className="w-full h-64 bg-zinc-200 rounded-xl"></div>

              <div className="flex justify-around mt-4 text-zinc-700 text-sm">
                <button className="flex items-center gap-1">👍 Like</button>
                <button className="flex items-center gap-1">💬 Comment</button>
                <button className="flex items-center gap-1">✈️ Share</button>
              </div>
            </div>

            {/* POST #2 */}
            <div className="bg-white rounded-3xl shadow border border-zinc-300 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src="/default-profile.jpg"
                  width={40}
                  height={40}
                  className="rounded-full"
                  alt="User"
                />
                <div>
                  <p className="font-semibold text-zinc-900">Zai Swan</p>
                  <p className="text-zinc-500 text-sm">
                    Class 2015, School of Science & Technology
                  </p>
                </div>
              </div>

              <p className="font-semibold text-zinc-900 mb-3">
                Throwback To University Life
              </p>

              <div className="w-full h-64 bg-zinc-200 rounded-xl"></div>

              <div className="flex justify-around mt-4 text-zinc-700 text-sm">
                <button className="flex items-center gap-1">👍 Like</button>
                <button className="flex items-center gap-1">💬 Comment</button>
                <button className="flex items-center gap-1">✈️ Share</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
