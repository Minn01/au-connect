"use client";

import Image from "next/image";
import Link from "next/link";
import { Home, UserPlus, PlusCircle, Bell, Search } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

import {
  CONNECT_PAGE_PATH,
  MAIN_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  SIGNIN_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  POST_PAGE_PATH,
  PROFILE_PAGE_PATH,
} from "@/lib/constants";

const mockUser = {
  name: "Zai Swan",
  title: "Game Developer",
  education: "Class 2015, School of Science & Technology",
  location: "Bangkok, Thailand",
  avatar: "/au-bg.png",
};

export default function Header() {
  const [currentPage, setCurrentPage] = useState(MAIN_PAGE_PATH);
  const pathName = usePathname();
  const hidden = [
    SIGNIN_PAGE_PATH,
    ONBOARD_PAGE_PATH,
  ].includes(pathName);

  return hidden ? null : (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src={'/au-connect-logo.png'} width={50} height={50} alt="au-connect-logo"/>
          <h1 className="text-xl font-bold text-gray-900">AU Connect</h1>
        </div>
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
            />
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href={MAIN_PAGE_PATH}
            onClick={() => setCurrentPage(MAIN_PAGE_PATH)}
            className={`flex flex-col items-center gap-1 ${
              currentPage == MAIN_PAGE_PATH ? "text-red-400" : "text-gray-600"
            } hover:text-red-600`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            href={CONNECT_PAGE_PATH}
            onClick={() => setCurrentPage(CONNECT_PAGE_PATH)}
            className={`flex flex-col items-center gap-1 ${
              currentPage == CONNECT_PAGE_PATH
                ? "text-red-400"
                : "text-gray-600"
            } hover:text-red-600`}
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-xs">Connect</span>
          </Link>
          <Link
            href={POST_PAGE_PATH}
            onClick={() => setCurrentPage(POST_PAGE_PATH)}
            className={`flex flex-col items-center gap-1 ${
              currentPage == POST_PAGE_PATH ? "text-red-400" : "text-gray-600"
            } hover:text-red-600`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-xs">Post</span>
          </Link>
          <Link
            href={NOTIFICATION_PAGE_PATH}
            onClick={() => setCurrentPage(NOTIFICATION_PAGE_PATH)}
            className={`flex flex-col items-center gap-1 ${
              currentPage == NOTIFICATION_PAGE_PATH
                ? "text-red-400"
                : "text-gray-600"
            } hover:text-red-600`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-xs">Notification</span>
          </Link>
          <Link
            href={PROFILE_PAGE_PATH}
            onClick={() => setCurrentPage(PROFILE_PAGE_PATH)}
            className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-red-400"
          >
            <Image
              src={mockUser.avatar}
              alt="Profile Avatar"
              fill={true}
              className="object-cover"
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}
