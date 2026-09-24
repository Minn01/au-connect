import type { AnnouncementStatus } from "@/lib/generated/prisma";

const ANNOUNCEMENT_TIME_ZONE = "Asia/Bangkok";
const BANGKOK_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function getStartOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ANNOUNCEMENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(
    Date.UTC(year, month - 1, day) - BANGKOK_UTC_OFFSET_MS,
  );
}

export function getStartOfNextDay(date: Date) {
  const startOfNextDay = getStartOfDay(date);
  startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);
  return startOfNextDay;
}

export function getAnnouncementStatus(
  startDate: Date,
  endDate: Date | null,
  now = new Date(),
): AnnouncementStatus {
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
