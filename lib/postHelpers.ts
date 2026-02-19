import type { Prisma } from "@/lib/generated/prisma";
import prisma from "@/lib/prisma";
import { PostMedia } from "@/types/PostMedia";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import {
  AZURE_STORAGE_ACCOUNT_KEY,
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "./env";
import { SAS_TOKEN_EXPIRE_DURATION } from "./constants";
import PostType from "@/types/Post";
import LinkEmbed from "@/types/LinkEmbeds";
import { PostMediaResolved } from "@/types/PostMediaResolved";

type JobPostWithApplications = Prisma.JobPostGetPayload<{
  include: {
    applications: {
      select: {
        id: true;
        status: true;
      };
    };
    _count: {
      select: {
        applications: true;
      };
    };
  };
}> & {
  positionsAvailable: number;
};

export async function getPostWithMedia(
  postId: string,
  currentUserId: string,
): Promise<PostType | null> {
  const post = await prisma.post.findUnique({
    where: { id: postId },

    include: {
      user: true,

      interactions: {
        where: {
          userId: currentUserId,
          type: "SAVED",
        },
        select: {
          id: true,
        },
      },

      jobPost: {
        include: {
          applications: {
            where: {
              applicantId: currentUserId,
            },
            select: {
              id: true,
              status: true,
            },
          },

          _count: {
            select: {
              applications: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return null;
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(
    AZURE_STORAGE_ACCOUNT_NAME,
    AZURE_STORAGE_ACCOUNT_KEY,
  );

  let mediaWithUrls: PostMediaResolved[] | null = null;

  if (post.media && Array.isArray(post.media)) {
    mediaWithUrls = (post.media as PostMedia[]).map((mediaItem) => {
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: AZURE_STORAGE_CONTAINER_NAME,
          blobName: mediaItem.blobName,
          permissions: BlobSASPermissions.parse("r"),
          expiresOn: new Date(Date.now() + SAS_TOKEN_EXPIRE_DURATION),
        },
        sharedKeyCredential,
      ).toString();

      const { file, previewUrl, ...safeMedia } = mediaItem;

      return {
        ...safeMedia,
        url: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_STORAGE_CONTAINER_NAME}/${mediaItem.blobName}?${sasToken}`,
      };
    });
  }

  let jobPostFormatted: PostType["jobPost"] = null;

  if (post.jobPost) {
    const jp = post.jobPost as JobPostWithApplications;

    jobPostFormatted = {
      ...jp,

      deadline: jp.deadline ? jp.deadline.toISOString() : undefined,

      positionsFilled: jp._count.applications,

      remainingPositions: jp.positionsAvailable - jp._count.applications,

      hasApplied: jp.applications.length > 0,

      applicationStatus: jp.applications[0]?.status ?? null,
    };
  }

  return {
    ...post,

    media: mediaWithUrls,

    links: post.links as LinkEmbed[] | null,

    pollEndsAt: post.pollEndsAt ?? null,

    pollVotes:
      post.pollVotes && typeof post.pollVotes === "object"
        ? (post.pollVotes as Record<string, string[]>)
        : undefined,

    username: post.user.username,

    profilePic: post.user.profilePic,

    isSaved: post.interactions.length > 0,

    jobPost: jobPostFormatted,
  };
}
