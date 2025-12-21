"use client";
import { useState, useEffect } from "react";

import LeftProfile from "./components/Feed_LeftProfile";
import MainFeed from "./components/Feed_MainFeed";
import RightEvents from "./components/Feed_RightEvents";
import User from "@/types/User";
import { fetchMediaUrl, fetchPosts, fetchUser } from "./profile/utils/fetchfunctions";
import PostType from "@/types/Post";

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
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [postList, setPostList] = useState<PostType[] | []>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const onNewPostCreated = (newPost: PostType) => {
    setPostList(prev => [newPost, ...prev])
  }

  useEffect(() => {
    fetchUser(
      (user: User | null) => setUser(user),
      (state: boolean) => setLoading(state)
    );
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchPosts(cursor, setPostList, setCursor, setLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    console.log("Cursor" + cursor);
  }, [cursor])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="md:grid md:grid-cols-12 md:gap-6">
        {/* LEFT PROFILE */}
        <LeftProfile user={user} loading={loading} />

        {/* MAIN FEED */}
        {user && <MainFeed user={user} posts={postList} loading={loading} onPostCreated={onNewPostCreated} />}

        {/* RIGHT EVENT SIDEBAR */}
        <RightEvents events={mockEvents} loading={loading} />
      </div>
    </div>
  );
}
