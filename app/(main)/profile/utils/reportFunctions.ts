import { REPORT_API_PATH } from "@/lib/constants";
import type { ReportSubmitPayload } from "@/types/ReportSubmitPayload";
import { VerificationRequiredError } from "@/lib/verificationError";

export async function postReport(payload: ReportSubmitPayload) {
  const res = await fetch(REPORT_API_PATH, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body?.requiresVerification) throw new VerificationRequiredError();
    throw new Error(body?.error || "Could not submit report");
  }

  return res.json();
}
