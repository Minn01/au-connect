import prisma from "@/lib/prisma";

export type AccountRestriction = {
  status: "SUSPENDED" | "BANNED";
  suspendedUntil: Date | null;
  reason: string | null;
};

export async function getAccountRestriction(
  userId: string,
): Promise<AccountRestriction | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountStatus: true, suspendedUntil: true },
  });

  if (!user) {
    return { status: "BANNED", suspendedUntil: null, reason: null };
  }

  if (
    user.accountStatus === "SUSPENDED" &&
    user.suspendedUntil &&
    user.suspendedUntil <= new Date()
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE", suspendedUntil: null },
    });
    return null;
  }

  if (user.accountStatus === "ACTIVE") return null;

  const latestAction = await prisma.moderationAction.findFirst({
    where: {
      targetType: "USER",
      targetId: userId,
      action: user.accountStatus === "BANNED" ? "BAN_USER" : "SUSPEND_USER",
    },
    orderBy: { createdAt: "desc" },
    select: { note: true },
  });

  return {
    status: user.accountStatus,
    suspendedUntil: user.suspendedUntil,
    reason: latestAction?.note ?? null,
  };
}
