"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// Components
import SectionCard from "../components/SectionCard";
import ExperienceItem from "../components/ExperienceItem";
import EducationItem from "../components/EducationItem";
import RecommendedList from "../components/RecommendedList";
import RecommendedModal from "../components/RecommendedModal";
import RecommendedCard from "../components/RecommendedCard";
import Post from "../components/Post";

/* Mock User */
const mockUser = {
  name: "Zai Swan",
  title: "Game Developer",
  education: "Class 2015, School of Science & Technology",
  location: "Bangkok, Thailand",
  avatar: "/au-bg.png",
  banner: "/au-bg.png",
  followers: "12,540",
};

/* Mock Posts */
const mockPosts = [
  {
    id: 1,
    author: "Zai Swan",
    education: "Class 2015, School of Science & Technology",
    title: "Exploring new ideas for my game dev project today.",
    timestamp: "4h",
    avatar: "/au-bg.png",
    image: "/au-bg.png",
  },
  {
    id: 2,
    author: "Zai Swan",
    education: "Class 2015, School of Science & Technology",
    title: "Throwback to university memories!",
    timestamp: "1d",
    avatar: "/au-bg.png",
  },
];

/* Recommended People */
const recommendedPeople = [
  {
    id: 1,
    name: "Courtney Henry",
    title: "Data-scientist",
    batch: "Class 2015, School of Science & Technology",
    location: "Bangkok, Thailand",
    avatar: "/au-connect-logo.png",
    isOnline: true,
  },
  {
    id: 2,
    name: "Michael Chen",
    title: "Product Manager",
    batch: "Class 2014, School of Business & Management",
    location: "Hong Kong",
    avatar: "/au-connect-logo.png",
    isOnline: false,
  },
  {
    id: 3,
    name: "Sarah Johnson",
    title: "Software Engineer",
    batch: "Class 2016, School of Engineering",
    location: "Singapore",
    avatar: "/au-connect-logo.png",
    isOnline: true,
  },
  {
    id: 4,
    name: "Leo Grande",
    title: "UX Designer",
    batch: "Class 2017, School of DDI",
    location: "Bangkok",
    avatar: "/au-connect-logo.png",
    isOnline: true,
  },
];

export default function ProfilePage() {
  const [tab, setTab] = useState("posts");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* LEFT MAIN CONTENT */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* PROFILE HEADER */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="relative h-56 w-full">
                <Image src={mockUser.banner} alt="banner" fill className="object-cover" />
              </div>

              <div className="p-4">
                <div className="relative -mt-16 w-32 h-32">
                  <Image
                    src={mockUser.avatar}
                    alt="avatar"
                    fill
                    className="rounded-full border-4 border-white object-cover"
                  />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mt-2">{mockUser.name}</h1>
                <p className="text-gray-700">{mockUser.title}</p>

                <p className="text-sm text-gray-600 mt-1">
                  {mockUser.location} · <span className="underline cursor-pointer">Contact info</span>
                </p>
                <p className="text-sm text-gray-600">{mockUser.followers} followers</p>

                <div className="flex gap-3 mt-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                    Follow
                  </button>
                  <button className="px-4 py-2 border rounded-lg text-gray-700">
                    Connect
                  </button>
                  <button className="px-3 py-2 border rounded-lg">
                    <MoreHorizontal />
                  </button>
                </div>
              </div>
            </div>

            {/* EXPERIENCE */}
            <SectionCard title="Experience">
              <ExperienceItem
                role="Game Developer"
                company="Freelance"
                period="2020 – Present"
              />
              <ExperienceItem
                role="Intern"
                company="AU Tech Lab"
                period="2019 – 2020"
              />
            </SectionCard>

            {/* EDUCATION */}
            <SectionCard title="Education">
              <EducationItem
                school="Assumption University"
                degree="B.Sc. Computer Science"
                period="2015 – 2019"
              />
            </SectionCard>

            {/* ABOUT */}
            <SectionCard title="About">
              <p className="text-sm text-gray-700">
                Passionate about game development and immersive digital experiences.
                Always exploring creative tools and engines.
              </p>
            </SectionCard>

            {/* ---------------- MOBILE RECOMMENDED PEOPLE (ABOVE Activity) ---------------- */}
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

            {/* ---------------- ACTIVITY ---------------- */}
            <SectionCard title="Activity">
              <p className="text-sm text-gray-600 mb-3">{mockUser.followers} followers</p>

              {/* Tabs */}
              <div className="flex gap-4 border-b pb-2">
                {["posts", "videos", "images", "documents"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`pb-2 capitalize ${
                      tab === t ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-gray-600"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                {tab === "posts"
                  ? mockPosts.map((p) => (
                      <Post key={p.id} post={p} isLoading={loading} />
                    ))
                  : (
                    <div className="text-center text-gray-600 py-10">
                      No {tab} yet
                    </div>
                  )}
              </div>
            </SectionCard>

          </div>

          {/* ---------------- RIGHT SIDEBAR (DESKTOP ONLY) ---------------- */}
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

      {/* ---------------- MODAL ---------------- */}
      <RecommendedModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        users={recommendedPeople}
      />
    </>
  );
}
