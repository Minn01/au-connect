import prisma from "@/lib/prisma";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export class CommunityAuthError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

export function isValidObjectId(value: string) {
  return OBJECT_ID_PATTERN.test(value);
}

export async function getManagedCommunity(userId: string, communityId: string) {
  if (!isValidObjectId(userId) || !isValidObjectId(communityId)) {
    return null;
  }

  const manager = await prisma.communityManager.findUnique({
    where: {
      communityId_userId: {
        communityId,
        userId,
      },
    },
    select: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          profilePic: true,
          coverPhoto: true,
          status: true,
        },
      },
    },
  });

  if (!manager || manager.community.status !== "ACTIVE") {
    return null;
  }

  return manager.community;
}

export async function requireManagedCommunity(
  userId: string,
  communityId: string,
) {
  const community = await getManagedCommunity(userId, communityId);

  if (!community) {
    throw new CommunityAuthError(
      "You are not allowed to manage this community",
      403,
    );
  }

  return community;
}
