"use client";

import JobDraft from "@/types/JobDraft";

// Assuming this mimics the shape of the 'post' objects in your jobPosts array
type SampleJobPost = {
  post: {
    id: string;
    content: string;
  };
  job: JobDraft;
  isSaved: boolean;
};

// Sample data shaped for JobPostCard. The card reads post.id, post.content,
// and the JobDraft fields inside job.
const sampleJobPosts: SampleJobPost[] = [
  {
    post: {
      id: "sample-job-post-1",
      content:
        "Join a product team building student and alumni networking features for AU Connect. You will work closely with design and backend engineers to ship polished web experiences.",
    },
    job: {
      id: "sample-job-1",
      jobTitle: "Frontend Engineer Intern",
      companyName: "AU Connect",
      location: "Bangkok, Thailand",
      locationType: "HYBRID",
      employmentType: "INTERNSHIP",
      salaryMin: 900,
      salaryMax: 1400,
      salaryCurrency: "USD",
      status: "OPEN",
      positionsAvailable: 3,
      positionsFilled: 1,
      remainingPositions: 2,
      deadline: "2026-07-15",
      jobDetails:
        "Build responsive React interfaces, improve shared UI components, and collaborate on product experiments.",
      jobRequirements: ["React", "TypeScript", "Tailwind CSS"],
      allowExternalApply: false,
      hasApplied: false,
      applicationStatus: null,
    },
    isSaved: true,
  },
  {
    post: {
      id: "sample-job-post-2",
      content:
        "We are looking for a backend developer to help improve job search, matching, and notification services for students and employers.",
    },
    job: {
      id: "sample-job-2",
      jobTitle: "Backend Developer",
      companyName: "Siam Digital Labs",
      location: "Remote",
      locationType: "REMOTE",
      employmentType: "FULL_TIME",
      salaryMin: 2500,
      salaryMax: 3800,
      salaryCurrency: "USD",
      status: "OPEN",
      positionsAvailable: 2,
      positionsFilled: 0,
      remainingPositions: 2,
      deadline: "2026-08-01",
      jobDetails:
        "Own API endpoints, database queries, and service integrations for a fast-moving education platform.",
      jobRequirements: ["Node.js", "PostgreSQL", "REST APIs"],
      allowExternalApply: false,
      hasApplied: true,
      applicationStatus: "APPLIED",
    },
    isSaved: false,
  },
  {
    post: {
      id: "sample-job-post-3",
      content:
        "Design dashboards and workflows that help employers review applicants and manage hiring pipelines with less manual work.",
    },
    job: {
      id: "sample-job-3",
      jobTitle: "Product Designer",
      companyName: "Campus Careers",
      location: "Bangkok, Thailand",
      locationType: "ONSITE",
      employmentType: "PART_TIME",
      salaryMin: 1200,
      salaryMax: 1800,
      salaryCurrency: "USD",
      status: "OPEN",
      positionsAvailable: 1,
      positionsFilled: 0,
      remainingPositions: 1,
      deadline: "2026-06-30",
      jobDetails:
        "Create user flows, wireframes, and high-fidelity designs for employer-facing hiring tools.",
      jobRequirements: ["Figma", "User Research", "Design Systems"],
      allowExternalApply: false,
      hasApplied: false,
      applicationStatus: null,
    },
    isSaved: false,
  },
];

enum JobTabFilters {
  ALL = "All jobs",
  SAVED = "Saved",
  APPLIED = "Applied",
}

import { useState } from "react";
import { JobPostCard } from "../components/JobPostCard";

export default function JobBoardUI() {
  const jobs = [
    {
      title: "Senior Front End Engineer",
      company: "Google",
      location: "Bangkok, Thailand",
      type: "Remote",
      status: "Open",
      skills: ["React", "CSS", "TypeScript", "Figma"],
    },
    {
      title: "UI/UX Designer",
      company: "Au Connect",
      location: "Bangkok, Thailand",
      type: "Onsite",
      status: "Open",
      skills: ["Figma", "Design Systems"],
    },
  ];

  const [selectedFilters, setSelectedFilters] = useState(true);
  const [jobTabFilter, setJobTabFilter] = useState<JobTabFilters>(
    JobTabFilters.SAVED,
  );

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-zinc-900 p-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <aside className="col-span-3 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
            <h2 className="text-sm tracking-wide text-zinc-500 mb-5 uppercase font-semibold">
              Filter Jobs
            </h2>

            <div className="mb-6">
              <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-2xl px-4 py-3">
                <input
                  placeholder="Keyword, skill, role..."
                  className="bg-transparent outline-none w-full text-sm placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3 text-zinc-700">
                  Employment type
                </h3>
                <div className="space-y-3 text-zinc-500">
                  {["Full-time", "Part-time", "Internship", "Contract"].map(
                    (item, i) => (
                      <label
                        key={i}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="accent-red-400"
                          defaultChecked={i === 0}
                        />
                        <span>{item}</span>
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-zinc-700">
                  Location type
                </h3>
                <div className="space-y-3 text-zinc-500">
                  {["Remote", "Onsite", "Hybrid"].map((item, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="accent-red-400"
                        defaultChecked={i !== 2}
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-zinc-700">Salary (USD/mo)</h3>
                  <span className="text-sm text-zinc-500">$3500</span>
                </div>
                <input type="range" className="w-full accent-red-400" />
              </div>

              <div>
                <h3 className="font-medium mb-3 text-zinc-700">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "React",
                    "CSS",
                    "Go",
                    "Python",
                    "Node.js",
                    "SQL",
                    "Docker",
                    "TypeScript",
                  ].map((skill, i) => (
                    <button
                      key={i}
                      className={`px-3 py-1.5 rounded-full border text-sm transition ${
                        i < 2
                          ? "bg-red-500/10 text-red-300 border-red-400/40"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFilters && (
                <button className="w-full mt-4 border border-zinc-200 rounded-2xl py-3 bg-white hover:bg-gray-100 transition">
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="col-span-6 space-y-6">
          {/* Recommendations */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-red-600 mb-1">
                  ✨ Recommended for you
                </p>
                <h2 className="text-2xl font-semibold">Top matches</h2>
              </div>

              <button className="border border-zinc-200 px-4 py-2 rounded-2xl hover:bg-zinc-100 transition cursor-pointer">
                See all
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 cursor-pointer">
              {jobs.map((job, i) => (
                <div
                  key={i}
                  className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 hover:border-red-400/40 transition"
                >
                  <div className="mb-4">
                    <p className="text-zinc-500 text-sm">{job.company}</p>
                    <h3 className="text-xl font-semibold leading-tight mt-1">
                      {job.title}
                    </h3>
                  </div>

                  <div className="space-y-1 text-sm text-zinc-500 mb-4">
                    <p>{job.location}</p>
                    <p>{job.type}</p>
                  </div>

                  <div className="inline-flex px-3 py-1 rounded-full bg-green-50 text-green-500 border border-green-400 text-sm">
                    95% match
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              {Object.values(JobTabFilters).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setJobTabFilter(filter)}
                  className={`px-5 py-3 rounded-2xl border transition cursor-pointer ${
                    jobTabFilter === filter
                      ? "bg-red-100 border-red-500 text-red-500"
                      : "bg-white border-zinc-200 text-gray-600"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              className={`px-5 py-3 rounded-2xl border transition bg-white border-zinc-200 text-gray-600`}
            >
              Most recent
            </button>
          </div>

          {/* Job Cards */}

          {/* TODO: job posts here */}
          <div className="space-y-4">
            {sampleJobPosts.map(({ post, job, isSaved }) => (
              <div
                key={post.id}
                className="bg-white border border-zinc-200 rounded-3xl shadow-xl"
              >
                <JobPostCard
                  post={post}
                  job={job}
                  isOwner={false}
                  hasApplied={job.hasApplied ?? false}
                  applicationStatus={job.applicationStatus ?? "APPLIED"}
                  isSaved={isSaved}
                  postMenuDropDownOpen={false}
                  setPostMenuDropDownOpen={() => {}}
                  popupOpen={false}
                  setPopupOpen={() => {}}
                  onTitleClick={() => {}}
                  onApply={() => {}}
                  onSaveToggle={() => {}}
                />
              </div>
            ))}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="col-span-3 space-y-6">
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

          <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
            <h2 className="font-semibold text-lg mb-6">Trending skills</h2>

            <div className="space-y-5">
              {[
                ["React", 80],
                ["Go", 65],
                ["Python", 50],
                ["TypeScript", 40],
              ].map(([skill, width], i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <span>{skill}</span>
                    <span className="text-zinc-500 text-sm">{width}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-400 to-red-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
