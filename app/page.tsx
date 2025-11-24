"use client";
import { BookOpen, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Post from "./components/Post";
import EventCard from "./components/EventCard";

// Mock Data
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

export default function Home() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const provider = searchParams.get("provider");

  // return (
  //   <div className="flex justify-center items-center h-screen flex-col gap-5">
  //     {success === 'true' ? (
  //       <div className='mb-4 p-4 bg-green-200 text-green-800 rounded'>
  //         {provider === 'google' ? 'Signed in with Google' : provider === 'linkedin' ? 'Signed in with LinkedIn' : 'OAuth'}
  //       </div>
  //     ) : null}

  //     <h1>Auth Successful! This is the home page</h1>
  //   </div>
  // );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1500);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Profile */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-20">
            <div className="h-24 bg-gray-200"></div>
            <div className="p-4 -mt-12">
              <div className="relative w-20 h-20 mb-3">
                <Image
                  src={mockUser.avatar}
                  alt={mockUser.name}
                  fill
                  className="rounded-full border-4 border-white object-cover"
                />
              </div>
              <h2 className="font-bold text-gray-900 text-lg">
                {mockUser.name}
              </h2>
              <p className="text-sm text-gray-600 mb-1">{mockUser.title}</p>
              <p className="text-xs text-gray-500 mb-1">{mockUser.education}</p>
              <p className="text-xs text-gray-500">{mockUser.location}</p>
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <div className="col-span-6 space-y-4">
          {/* Create Post */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-10 h-10">
                <Image
                  src={mockUser.avatar}
                  alt={mockUser.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
              <input
                type="text"
                placeholder="What's new Today?"
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex gap-4 pl-13">
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

          {/* Posts */}
          {loading ? (
            <>
              <Post isLoading={true} />
              <Post isLoading={true} />
            </>
          ) : (
            mockPosts.map((post) => <Post key={post.id} post={post} />)
          )}
        </div>

        {/* Right Sidebar - Events */}
        <div className="col-span-3 space-y-4">
          {loading ? (
            <>
              <EventCard isLoading={true} />
              <EventCard isLoading={true} />
            </>
          ) : (
            mockEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
