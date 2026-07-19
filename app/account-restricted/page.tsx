import { redirect } from "next/navigation";
import getCurrentUser from "@/lib/getCurrentUser";
import { getAccountRestriction } from "@/lib/accountStatus";
import SignOutButton from "./SignOutButton";

export default async function AccountRestrictedPage() {
  const auth = await getCurrentUser();
  if (!auth) redirect("/auth/register");

  const restriction = await getAccountRestriction(auth.userId);
  if (!restriction) redirect("/");

  const isBanned = restriction.status === "BANNED";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">
          !
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {isBanned ? "Account banned" : "Account suspended"}
        </h1>
        <p className="mt-3 text-gray-600">
          {isBanned
            ? "Your account has been permanently restricted by moderation."
            : "Your account is temporarily restricted by moderation."}
        </p>
        {restriction.reason && (
          <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</p>
            <p className="mt-1 text-sm text-gray-800">{restriction.reason}</p>
          </div>
        )}
        {!isBanned && restriction.suspendedUntil && (
          <p className="mt-5 text-sm text-gray-600">
            Access will be restored after{" "}
            <span className="font-medium text-gray-900">
              {restriction.suspendedUntil.toLocaleString()}
            </span>
            .
          </p>
        )}
        <SignOutButton />
      </section>
    </main>
  );
}
