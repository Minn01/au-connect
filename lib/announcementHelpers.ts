import type { AnnouncementStatus } from "@/lib/generated/prisma";

export function getAnnouncementStatus(
  startDate: Date,
  endDate: Date | null
): AnnouncementStatus {
  const now = new Date();

  if (startDate > now) {
    return "SCHEDULED";
  }

  if (endDate && endDate < now) {
    return "EXPIRED";
  }

  return "ACTIVE";
}
