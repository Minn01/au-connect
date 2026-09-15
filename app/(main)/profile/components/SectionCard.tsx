"use client";

import React from "react";

export default function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Title + optional icon */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-purple-50 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-950">
          {title}
        </h2>

        {/* render icon directly (NO button wrapper) */}
        {icon}
      </div>

      <div className="space-y-3 p-4">
        {children}
      </div>
    </div>
  );
}
