"use client";

import { MY_APPLICATIONS_API_PATH } from "@/lib/constants";
import User from "@/types/User";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type MyApplicationSectionProps = {
  user: User | null;
  userLoading: boolean;
};

export function MyApplicationSection({
  user,
  userLoading,
}: MyApplicationSectionProps) {

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const res = await fetch(MY_APPLICATIONS_API_PATH);

      if (!res.ok) {
        throw new Error("Failed to fetch applications");
      }

      return res.json();
    },
  });

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
      <h2 className="font-semibold text-lg mb-5">Your applications</h2>

      <div className="space-y-4">
        {[
          {
            role: "Sr. Front End Eng.",
            company: "Google",
            status: "Reviewed",
          },
          {
            role: "Backend Dev",
            company: "Au Connect",
            status: "Pending",
          },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{item.role}</h3>
              <p className="text-sm text-zinc-500">{item.company}</p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-sm border ${
                item.status === "Reviewed"
                  ? "bg-green-50 border-green-400 text-green-500"
                  : "bg-yellow-50 border-yellow-400 text-yellow-500"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
