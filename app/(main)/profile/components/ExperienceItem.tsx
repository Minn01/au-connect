"use client";

import { BriefcaseBusiness, Building2, CalendarDays } from "lucide-react";

import type { EmploymentType } from "@/lib/generated/prisma";
import type Experience from "@/types/Experience";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
};

export default function ExperienceItem(exp: Experience) {
  const start = `${MONTHS[exp.startMonth]} ${exp.startYear}`;
  const end = exp.isCurrent
    ? "Present"
    : `${MONTHS[exp.endMonth!]} ${exp.endYear}`;

  return (
    <div className="group flex gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-white to-blue-50/40 p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 ring-1 ring-blue-200">
        <BriefcaseBusiness className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-950">{exp.title}</h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            {exp.company}
          </span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {EMPLOYMENT_LABELS[exp.employmentType]}
          </span>
        </div>

        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {start} - {end}
        </p>
      </div>
    </div>
  );
}
