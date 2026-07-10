import { ReportTargetType } from "./Report";

export type ReportTargetSnapshot = {
  type?: ReportTargetType;
  id: string;
  username?: string | null;
  profilePic?: string | null;
  title?: string | null;
  content?: string | null;
  media?: unknown;
  links?: unknown;
};