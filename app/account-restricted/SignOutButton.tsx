"use client";

import { LOGOUT_API_PATH, SIGNIN_PAGE_PATH } from "@/lib/constants";
import { clearClientSessionStorage } from "@/lib/client/logoutCleanup";
import { BASE_PATH } from "@/lib/basePath";
import { useState } from "react";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    await fetch(LOGOUT_API_PATH, { method: "DELETE" });
    clearClientSessionStorage();
    // Hard navigation isn't basePath-prefixed by Next, so add it manually.
    window.location.href = `${BASE_PATH}${SIGNIN_PAGE_PATH}`;
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className="mt-7 rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
    >
      {loading ? "Signing out..." : "Sign out"}
    </button>
  );
}
