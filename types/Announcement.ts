export type AnnouncementStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED";

export type Announcement = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  thumbnailBlobName: string;
  contentImageBlobName: string | null;
  status: AnnouncementStatus;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementsResponse = {
  announcements: Announcement[];
  nextCursor: string | null;
};
