import type { AnnouncementStatus } from "@/lib/generated/prisma";

export function getStartOfDay(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

export function getStartOfNextDay(date: Date) {
  const startOfNextDay = getStartOfDay(date);
  startOfNextDay.setDate(startOfNextDay.getDate() + 1);
  return startOfNextDay;
}

export function getAnnouncementStatus(
  startDate: Date,
  endDate: Date | null
): AnnouncementStatus {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const tomorrowStart = getStartOfNextDay(now);

  if (startDate >= tomorrowStart) {
    return "SCHEDULED";
  }

  if (endDate && endDate < todayStart) {
    return "EXPIRED";
  }

  return "ACTIVE";
}
