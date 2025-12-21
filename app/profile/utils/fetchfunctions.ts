import { LOGOUT_API_PATH, ME_API_PATH, POST_API_PATH } from "@/lib/constants";
import PostType from "@/types/Post";
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
      setLoading(false);
      return;
    }

    const data = await res.json();
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

    redirect();
  } catch (e) {
    console.error("Logout error:", e instanceof Error ? e.message : e);
    return false;
  }
}

export async function handleCreatePost(
  postType: string,
  title: string,
  postContent: string,
  selectedVisibility: string,
  disableComments: boolean,
  uploadedMedia: { blobName: string; type: string; name: string, mimetype: string; size: number }[],
  setIsOpen: (state: boolean) => void
) {
  try {
    const res = await fetch(POST_API_PATH, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType,
        title,
        content: postContent,
        visibility: selectedVisibility,
        disableComments,
        media: uploadedMedia,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create post");
    }

    const createdPost = await res.json()
    setIsOpen(false);
    return createdPost
  } catch (error) {
    console.error("Create post error:", error);
  }
}

export async function fetchPosts(
  cursor: string | null,
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>,
  setCursor: React.Dispatch<React.SetStateAction<string | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  try {
    setLoading(true);

    const url = new URL(POST_API_PATH, window.location.origin);
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch posts");
    }

    const { posts, nextCursor } = await res.json();

    setPosts((prev) => [...prev, ...posts]);
    setCursor(nextCursor);
  } catch (err) {
    console.error("Fetch posts error:", err);
  } finally {
    setLoading(false);
  }
}

export async function fetchMediaUrl() {
  
}