import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getHeaderUserInfo } from "@/lib/authFunctions";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/lib/env";
import { POSTS_PER_FETCH, SAS_TOKEN_EXPIRE_DURATION } from "@/lib/constants";
import type { PostMedia, PostMediaWithUrl } from "@/types/PostMedia";

// Validate Mongo ObjectId
function isValidObjectId(id: string) {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export async function getProfilePosts(req: NextRequest, profileUserId: string) {
  try {
    const [userEmail, viewerUserId] = getHeaderUserInfo(req);

    if (!userEmail || !viewerUserId) {
      return NextResponse.json(
        { error: "Unauthorized action please sign in again" },
        { status: 401 }
      );
    }

    // ✅ Normalize (double-safe)
    const normalizedProfileUserId = decodeURIComponent(profileUserId).trim();

    // (optional debug)
    console.log("PROFILE POSTS userId param:", {
      raw: profileUserId,
      normalized: normalizedProfileUserId,
      len: normalizedProfileUserId.length,
      isValid: isValidObjectId(normalizedProfileUserId),
    });

    // ✅ Validate only ONCE (use normalized)
    if (!normalizedProfileUserId || !isValidObjectId(normalizedProfileUserId)) {
      return NextResponse.json(
        {
          error: "Invalid userId",
          received: profileUserId,
          normalized: normalizedProfileUserId,
        },
        { status: 400 }
      );
    }

    const cursor = req.nextUrl.searchParams.get("cursor");

    // ✅ NEW: tab support
    const tab = (req.nextUrl.searchParams.get("tab") ?? "posts").toLowerCase();

    // Map UI tabs → stored media types
    const mediaType =
      tab === "images"
        ? "image"
        : tab === "videos"
        ? "video"
        : tab === "documents"
        ? "file"
        : null;

    const posts = await prisma.post.findMany({
      where: {
        userId: normalizedProfileUserId, // ✅ important fix
        ...(mediaType ? { mediaTypes: { has: mediaType } } : {}),
      },
      take: POSTS_PER_FETCH,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
        interactions: {
          where: { userId: viewerUserId, type: "LIKE" },
          select: { id: true },
        },
      },
    });

    const postWithCommentCount = posts.map((post) => ({
      ...post,
      isLiked: post.interactions.length > 0,
      numOfComments: post._count.comments,
    }));

    const sharedKeyCredential = new StorageSharedKeyCredential(
      AZURE_STORAGE_ACCOUNT_NAME,
      AZURE_STORAGE_ACCOUNT_KEY
    );

    const postsWithMedia = postWithCommentCount.map((post) => {
      if (!post.media || !Array.isArray(post.media)) return post;

      const media = post.media as PostMedia[];

      const mediaWithUrls: PostMediaWithUrl[] = media.map((mediaItem) => {
        const sasToken = generateBlobSASQueryParameters(
          {
            containerName: AZURE_STORAGE_CONTAINER_NAME,
            blobName: mediaItem.blobName,
            permissions: BlobSASPermissions.parse("r"),
            expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
          },
          sharedKeyCredential
        ).toString();

        const thumbnailUrl = mediaItem.thumbnailBlobName
          ? `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.thumbnailBlobName}?${generateBlobSASQueryParameters(
              {
                containerName: AZURE_STORAGE_CONTAINER_NAME,
                blobName: mediaItem.thumbnailBlobName,
                permissions: BlobSASPermissions.parse("r"),
                expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
              },
              sharedKeyCredential
            ).toString()}`
          : undefined;

        return {
          ...mediaItem,
          url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
          thumbnailUrl,
        };
      });

      return { ...post, media: mediaWithUrls };
    });

    return NextResponse.json({
      posts: postsWithMedia,
      nextCursor: posts.length ? posts[posts.length - 1].id : null,
    });
  } catch (error) {
    console.error("Error fetching profile posts:", error);
    return NextResponse.json(
      { error: "Internal server error; fetching profile posts" },
      { status: 500 }
    );
  }
}
