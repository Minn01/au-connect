"use client";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  UserPlus,
  PlusCircle,
  Bell,
  Search,
  Menu,
  X,
  MessageCircleMore,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  CONNECT_PAGE_PATH,
  MAIN_PAGE_PATH,
  NOTIFICATION_PAGE_PATH,
  SIGNIN_PAGE_PATH,
  ONBOARD_PAGE_PATH,
  MESSAGES_PAGE_PATH,
  PROFILE_PAGE_PATH,
  // PROFILE_PAGE_PATH,
} from "@/lib/constants";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathName = usePathname();
  const navBarIndicatedPages = [
    MAIN_PAGE_PATH,
    CONNECT_PAGE_PATH,
    MESSAGES_PAGE_PATH,
    NOTIFICATION_PAGE_PATH,
    PROFILE_PAGE_PATH
  ];

  const currentPage = navBarIndicatedPages.includes(pathName)
    ? pathName
    : "not-valid-path";
  const hidden = [SIGNIN_PAGE_PATH, ONBOARD_PAGE_PATH].includes(pathName);

  return hidden ? null : (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Desktop and Mobile Top Bar */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src={"/au-connect-logo.png"}
              width={50}
              height={50}
              alt="au-connect-logo"
            />
            <h1 className="text-xl font-bold text-gray-900">AU Connect</h1>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={MAIN_PAGE_PATH}
              className={`flex flex-col items-center gap-1 ${
                currentPage == MAIN_PAGE_PATH ? "text-red-400" : "text-gray-600"
              } hover:text-red-600`}
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">Home</span>
            </Link>
            <Link
              href={CONNECT_PAGE_PATH}
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
              href={MESSAGES_PAGE_PATH}
              className={`flex flex-col items-center gap-1 ${
                currentPage == MESSAGES_PAGE_PATH
                  ? "text-red-400"
                  : "text-gray-600"
              } hover:text-red-600`}
            >
              <MessageCircleMore className="w-5 h-5" />
              <span className="text-xs">Messaging</span>
            </Link>
            <Link
              href={NOTIFICATION_PAGE_PATH}
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
              className={`flex flex-col items-center gap-1 ${
                currentPage == PROFILE_PAGE_PATH
                  ? "text-red-400"
                  : "text-gray-600"
              } hover:text-red-600`}
            >
              <UserRound className="w-5 h-5"/>
              <span className="text-xs">Profile</span>
            </Link>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-red-600"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-600 rounded-full focus:outline-none focus:border-red-400"
            />
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col gap-4">
              <Link
                href={MAIN_PAGE_PATH}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  currentPage == MAIN_PAGE_PATH
                    ? "bg-red-50 text-red-400"
                    : "text-gray-600"
                } hover:bg-red-50 hover:text-red-600`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </Link>
              <Link
                href={CONNECT_PAGE_PATH}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  currentPage == CONNECT_PAGE_PATH
                    ? "bg-red-50 text-red-400"
                    : "text-gray-600"
                } hover:bg-red-50 hover:text-red-600`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Connect</span>
              </Link>
              <Link
                href={MESSAGES_PAGE_PATH}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  currentPage == MESSAGES_PAGE_PATH
                    ? "bg-red-50 text-red-400"
                    : "text-gray-600"
                } hover:bg-red-50 hover:text-red-600`}
              >
                <PlusCircle className="w-5 h-5" />
                <span className="font-medium">Post</span>
              </Link>
              <Link
                href={NOTIFICATION_PAGE_PATH}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  currentPage == NOTIFICATION_PAGE_PATH
                    ? "bg-red-50 text-red-400"
                    : "text-gray-600"
                } hover:bg-red-50 hover:text-red-600`}
              >
                <Bell className="w-5 h-5" />
                <span className="font-medium">Notification</span>
              </Link>
              <Link
                href={PROFILE_PAGE_PATH}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
                  currentPage == PROFILE_PAGE_PATH
                    ? "bg-red-50 text-red-400"
                    : "text-gray-600"
                } hover:bg-red-50 hover:text-red-600`}
              >
                <UserRound className="w-5 h-5"/>
                <span className="font-medium">Profile</span>
              </Link>
              {/* <Link
                href={PROFILE_PAGE_PATH}
                onClick={() => handleNavClick(PROFILE_PAGE_PATH)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-red-400">
                  <Image
                    src={mockUser.avatar}
                    alt="Profile Avatar"
                    fill={true}
                    className="object-cover"
                  />
                </div>
                <span className="font-medium">Profile</span>
              </Link> */}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
