"use client";

import { MY_APPLICATIONS_API_PATH } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";

type MyApplication = {
  id: string;
  status: string;
  jobPost: {
    id: string;
    jobTitle: string;
    companyName: string | null;
  };
};

export function MyApplicationSection() {
  const {
    data: applications = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async (): Promise<MyApplication[]> => {
      const res = await fetch(MY_APPLICATIONS_API_PATH);

      if (!res.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await res.json();
      console.log(data);
      return data.applications;
    },
  });

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
      <h2 className="font-semibold text-lg mb-5">Your applications</h2>

      <div className="space-y-4">
        {applications.length > 0 ? (
          applications.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{item.jobPost.jobTitle}</h3>
                <p className="text-sm text-zinc-500">
                  {item.jobPost.companyName}
                </p>
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
          ))
        ) : (
          <p className="text-sm text-zinc-500 text-left">No applications yet</p>
        )}
      </div>
    </div>
  );
}
