// "use client";
//import { useState, useEffect } from "react";
import LeftProfile from "./components/Feed_LeftProfile";
import MainFeed from "./components/Feed_MainFeed";
import RightEvents from "./components/Feed_RightEvents";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { buildSlug } from "@/app/profile/utils/buildSlug";


const mockUser = {
  name: "Zai Swan",
  title: "Game Developer",
  education: "Class 2015, School of Science & Technology",
  location: "Bangkok, Thailand",
  avatar: "/au-bg.png",
};

const mockPosts = [
  {
    id: 1,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back To My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 2,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back To My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 3,
    author: "Floyd Miles",
    education: "Class 2015, School of Martin De Tours",
    avatar: "/au-bg.png",
    title: "Back To My Graduation Days",
    timestamp: "2h",
    image: "/au-bg.png",
  },
  {
    id: 4,
    author: "Floyd Miles",
    education: "Class 2015, School of Nursing Science",
    avatar: "/au-bg.png",
    timestamp: "5h",
  },
];

const mockEvents = [
  {
    id: 1,
    title: "Loi Krathong",
    location: "Sala Thai",
    date: "Wednesday, 05/11/2025",
  },
  {
    id: 2,
    title: "Christmas Eve",
    location: "SM",
    date: "Wednesday, 25/12/2025",
  },
];

export default async function Home() {
  const session = await getCurrentUser();

  let currentUser = null;

  if (session?.userId) {
    currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });
  }

  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   setTimeout(() => setLoading(false), 1500);
  // }, []);


  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="md:grid md:grid-cols-12 md:gap-6">
        {/* LEFT PROFILE */}
        <LeftProfile
          user={{
            name: currentUser?.username || "Guest User",
            title: currentUser?.title || "No title yet",
            education: currentUser?.education || "",
            location: currentUser?.location || "",
            avatar: currentUser?.profilePic || "/default-avatar.png",
            slug: currentUser ? buildSlug(currentUser.username, currentUser.id) : "",

          }}
          loading={!currentUser}
        />

        {/* MAIN FEED */}
        <MainFeed user={mockUser} posts={mockPosts} loading={!currentUser}/>

        {/* RIGHT EVENT SIDEBAR */}
        <RightEvents events={mockEvents} loading={!currentUser}/>
      </div>
    </div>
  );
}
