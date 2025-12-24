import { LOGOUT_API_PATH, ME_API_PATH, POST_API_PATH } from "@/lib/constants";
import PostType from "@/types/Post";

export async function fetchUser() {
  const res = await fetch(ME_API_PATH, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }

  const data = await res.json();
  return data.user;
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
  uploadedMedia: {
    blobName: string;
    type: string;
    name: string;
    mimetype: string;
    size: number;
  }[],
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

    const createdPost = await res.json();
    setIsOpen(false);
    return createdPost;
  } catch (error) {
    console.error("Create post error:", error);
  }
}

// export async function fetchPosts(
//   cursor: string | null,
//   setPosts: React.Dispatch<React.SetStateAction<PostType[]>>,
//   setCursor: React.Dispatch<React.SetStateAction<string | null>>,
//   setLoading: React.Dispatch<React.SetStateAction<boolean>>
// ) {
//   try {
//     setLoading(true);

//     const url = new URL(POST_API_PATH, window.location.origin);
//     if (cursor) url.searchParams.set("cursor", cursor);

//     const res = await fetch(url.toString(), {
//       method: "GET",
//       cache: "no-store",
//     });

//     if (!res.ok) {
//       throw new Error("Failed to fetch posts");
//     }

//     const { posts, nextCursor } = await res.json();

//     setPosts((prev) => {
//       const map = new Map<string, PostType>();

//       // keep existing posts
//       for (const post of prev) {
//         if (post.id) map.set(post.id, post);
//       }

//       // add new posts (overwrites duplicates)
//       for (const post of posts) {
//         map.set(post.id, post);
//       }

//       return Array.from(map.values());
//     });
//     setCursor(nextCursor);
//   } catch (err) {
//     console.error("Fetch posts error:", err);
//   } finally {
//     setLoading(false);
//   }
// }
  

export async function fetchPosts({
  pageParam = null,
}: {
  pageParam?: string | null;
}) {
  const url = pageParam
    ? `${POST_API_PATH}?cursor=${pageParam}`
    : POST_API_PATH;

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Client side error; Failed to fetch posts");
  }

  return await res.json();
}


export async function fetchMediaUrl() {}
