"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, Clock3, X } from "lucide-react";
import { ACCOUNT_VERIFICATION_PAGE_PATH } from "@/lib/constants";

type VerificationStatus = "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export default function VerificationRequiredModal({
  open,
  onClose,
  action,
  status,
}: {
  open: boolean;
  onClose: () => void;
  action?: string;
  /** Current verification status of the user, used to tailor the message. */
  status?: VerificationStatus;
}) {
  const router = useRouter();

  if (!open) return null;

  const isPending = status === "PENDING";

  const handleGoToVerification = () => {
    onClose();
    router.push(ACCOUNT_VERIFICATION_PAGE_PATH);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          {isPending ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Clock3 className="h-6 w-6 text-amber-600" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <ShieldCheck className="h-6 w-6 text-red-600" />
            </div>
          )}

          <h2 className="text-lg font-bold text-neutral-950">
            {isPending ? "Verification under review" : "Verification required"}
          </h2>

          <p className="text-sm leading-relaxed text-neutral-600">
            {isPending ? (
              <>
                Your account verification is being reviewed by an admin. You’ll be
                able to {action ?? "do this"} once it’s approved.
              </>
            ) : (
              <>
                {action
                  ? `You need a verified AU Connect account to ${action}.`
                  : "You need a verified AU Connect account to perform this action."}
                {" "}Submit your AU documents for a quick admin review.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleGoToVerification}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white ${
              isPending
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isPending ? "View verification status" : "Verify my account"}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {isPending ? "Got it" : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}
