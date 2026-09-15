"use client";

import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";

import type Education from "@/types/Education";

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

export default function EducationItem({
  school,
  degree,
  fieldOfStudy,
  startMonth,
  startYear,
  endMonth,
  endYear,
}: Education) {
  const start = `${MONTHS[startMonth]} ${startYear}`;
  const end = `${MONTHS[endMonth]} ${endYear}`;

  return (
    <div className="group flex gap-3 rounded-xl border border-slate-100 bg-gradient-to-r from-white to-purple-50/40 p-3 shadow-sm transition hover:border-purple-200 hover:shadow-md">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 ring-1 ring-purple-200">
        <GraduationCap className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-950">{school}</h3>

        {(degree || fieldOfStudy) && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-700">
            <BookOpen className="h-4 w-4 text-slate-400" />
            {[degree, fieldOfStudy].filter(Boolean).join(" - ")}
          </p>
        )}

        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {start} - {end}
        </p>
      </div>
    </div>
  );
}
