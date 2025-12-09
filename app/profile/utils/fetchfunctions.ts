import {
  LOGOUT_API_PATH,
  ME_API_PATH,
  SIGNIN_PAGE_PATH,
} from "@/lib/constants";
import User from "@/types/User";

export async function fetchUser(
  setUser: (user: User | null) => void,
  setLoading: (state: boolean) => void
) {
  try {
    setLoading(true);
    const res = await fetch(ME_API_PATH, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch user:", res.status);
      setUser(null);
      return;
    }

    const data = await res.json();
    console.log("fetched response:", data.user);
    setUser(data.user);
    setLoading(false);
  } catch (err) {
    setLoading(false);
    console.error("Error fetching user:", err);
    setUser(null);
  }
}

export async function handleLogout(redirect: () => void) {
  try {
    const res = await fetch(LOGOUT_API_PATH, {
      method: "DELETE",
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Logout failed");
    }

    redirect()
  } catch (e) {
    console.error("Logout error:", e instanceof Error ? e.message : e);
    return false;
  }
}
