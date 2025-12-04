import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { parseSlug } from "../utils/parseSlug";
import { buildSlug } from "../utils/buildSlug";
import { getCurrentUser } from "@/lib/getCurrentUser";
import ProfileView from "../components/ProfileView";
import { safeUserSelect } from "@/lib/safeUserCall"; // ensure correct filename

// Validate Mongo ObjectId
function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

// Validate slug format (username-anything-id)
function isValidSlugFormat(slug: string) {
  return /^[a-z0-9-]+-[a-fA-F0-9]{24}$/.test(slug);
}

export default async function ProfilePage(props: { params: Promise<{ slug: string }> }) {
  // 1️⃣ Await params safely
  const { slug } = await props.params;

  if (!slug || !isValidSlugFormat(slug)) {
    return redirect("/404");
  }

  // 2️⃣ Extract ObjectId from slug
  const { id } = parseSlug(slug);

  if (!id || !isValidObjectId(id)) {
    return redirect("/404");
  }

  // 3️⃣ Secure fetch — ONLY selected fields
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });

  // Avoid user ID enumeration
  if (!user) {
    return redirect("/404");
  }

  // 4️⃣ Validate correct slug (SEO + anti-guessing)
  const correctSlug = buildSlug(user.username, user.id);
  if (slug !== correctSlug) {
    return redirect(`/profile/${correctSlug}`);
  }

  // 5️⃣ Determine ownership
  const session = await getCurrentUser();
  const isOwner = session?.userId === user.id;

  // 6️⃣ Render public-safe profile
  return (
    <ProfileView
      user={{
        name: user.username,
        avatar: user.profilePic || "/default_profile.jpg",
        coverPhoto: user.coverPhoto || "/default_cover.jpg",
        title: user.title || "",
        location: user.location || "",
        about: user.about || "",
        connections: user.connections || 0,
        experience: user.experience,
        education: user.education,
        posts: user.posts,
      }}
      recommendedPeople={[]} // add later
      isOwner={isOwner}
    />
  );
}
