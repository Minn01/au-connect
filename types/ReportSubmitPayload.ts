import { ReportReason, ReportTargetType } from "@/lib/generated/prisma";

export type ReportSubmitPayload = {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
};
