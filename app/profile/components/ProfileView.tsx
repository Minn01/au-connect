"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Camera } from "lucide-react";

import SectionCard from "./SectionCard";
import ExperienceItem from "./ExperienceItem";
import EducationItem from "./EducationItem";
import RecommendedList from "./RecommendedList";
import RecommendedModal from "./RecommendedModal";
import RecommendedCard from "./RecommendedCard";

import Post from "@/app/components/Post";

export default function ProfileView({ user, recommendedPeople, isOwner }) {
  const [tab, setTab] = useState("posts");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT MAIN CONTENT */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* PROFILE HEADER */}
            <div className="bg-white rounded-lg border overflow-hidden">

              {/* Cover Photo */}
              <div className="relative h-56 w-full bg-gray-200">
                {user.coverPhoto && (
                  <Image
                    src={user.coverPhoto}
                    alt="cover photo"
                    fill
                    className="object-cover"
                  />
                )}

                {/* Cover edit button */}
                {isOwner && (
                  <button className="absolute top-3 right-3 bg-white/80 p-2 rounded-full shadow">
                    <Camera size={18} className="text-gray-700" />
                  </button>
                )}
              </div>


              {/* MAIN CONTENT + FLOATING EDIT PROFILE BUTTON */}
              <div className="relative p-4">

                {/* RIGHT SIDE ACTION BUTTONS */}
                <div className="absolute top-4 right-4 flex items-center gap-3">
                  {isOwner ? (
                    // OWNER → SHOW EDIT PROFILE
                    <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm bg-white">
                      <Pencil size={16} />
                      Edit Profile
                    </button>
                  ) : (
                    // NOT OWNER → SHOW CONNECT + MESSAGE
                    <>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
                        Connect
                      </button>

                      <button className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm bg-white">
                        Message
                      </button>
                    </>
                  )}
                </div>


                {/* Avatar */}
                <div className="relative -mt-16 w-32 h-32">
                  <Image
                    src={user.avatar}
                    alt="avatar"
                    fill
                    className="rounded-full border-4 border-white object-cover"
                  />

                  {/* Avatar camera icon */}
                  {isOwner && (
                    <button className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full shadow">
                      <Camera size={18} className="text-gray-700" />
                    </button>
                  )}
                </div>

                {/* Name & Details */}
                <h1 className="text-2xl font-bold text-gray-900 mt-2">{user.name}</h1>
                <p className="text-gray-700">{user.title}</p>

                <p className="text-sm text-gray-600 mt-1">
                  {user.location} · <span className="underline cursor-pointer">Contact info</span>
                </p>

                <p className="text-sm text-gray-600">{user.connections} connections</p>

              </div>
            </div>


            {/* EXPERIENCE */}
            <SectionCard
              title="Experience"
              icon={isOwner ? <Pencil size={18} className="text-gray-500" /> : null}
            >
              {(user.experience || []).map((exp) => (
                <ExperienceItem key={exp.id} {...exp} />
              ))}
            </SectionCard>

            {/* EDUCATION */}
            <SectionCard
              title="Education"
              icon={isOwner ? <Pencil size={18} className="text-gray-500" /> : null}
            >
              {(user.education || []).map((edu) => (
                <EducationItem key={edu.id} {...edu} />
              ))}
            </SectionCard>

            {/* ABOUT */}
            <SectionCard
              title="About"
              icon={isOwner ? <Pencil size={18} className="text-gray-500" /> : null}
            >
              <p className="text-sm text-gray-700">
                {user.about || "This user has not added an about section yet."}
              </p>
            </SectionCard>

            {/* MOBILE RECOMMENDED PEOPLE */}
            
              <div className="lg:hidden">
                <SectionCard title="People you may be interested in">
                  <div className="flex gap-4 overflow-x-auto py-2 scrollbar-hide">
                    {recommendedPeople.map((u) => (
                      <div key={u.id} className="min-w-[200px]">
                        <RecommendedCard user={u} />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setOpenModal(true)}
                    className="text-sm text-blue-600 font-semibold mt-2"
                  >
                    Show more
                  </button>
                </SectionCard>
              </div>
            

            {/* ACTIVITY */}
            <SectionCard title="Activity">
              <p className="text-sm text-gray-600 mb-3">
                {user.connections} connections
              </p>

              {/* TABS + CREATE POST BUTTON */}
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex gap-4">
                  {["posts", "videos", "images", "documents"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`pb-2 capitalize ${tab === t
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600"
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* RIGHT-ALIGNED CREATE POST */}
                {isOwner && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                    Create Post
                  </button>
                )}
              </div>

              {/* POSTS */}
              <div className="mt-4 space-y-4">
                {tab === "posts" ? (
                  (user.posts || []).length > 0 ? (
                    user.posts.map((p) => (
                      <Post key={p.id} post={p} isLoading={loading} />
                    ))
                  ) : (
                    <div className="text-center text-gray-600 py-10">
                      No posts yet
                    </div>
                  )
                ) : (
                  <div className="text-center text-gray-600 py-10">
                    No {tab} yet
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT SIDEBAR FOR OTHER USERS */}
          
            <div className="hidden lg:block col-span-4 space-y-4 sticky top-20 h-fit">
              <div className="bg-white rounded-lg border p-4">
                <h2 className="font-semibold text-gray-900 mb-3">
                  People you may be interested in
                </h2>

                <RecommendedList users={recommendedPeople} limit={4} />

                <button
                  onClick={() => setOpenModal(true)}
                  className="mt-4 text-sm text-blue-600 font-semibold"
                >
                  Show more
                </button>
              </div>
            </div>
          
        </div>
      </div>

      {/* MODAL */}
      <RecommendedModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        users={recommendedPeople}
      />
    </>
  );
}
