"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import AddEditEducationModal from "./AddEditEducationModal";
import type Education from "@/types/Education";
import { ADD_EDUCATION_API_PATH, BASE_API_PATH, DELETE_EDUCATION_API_PATH } from "@/lib/constants";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function EducationManagerModal({
  open,
  onClose,
  education,
  setEducation,
}: {
  open: boolean;
  onClose: () => void;
  education: Education[];
  setEducation: React.Dispatch<React.SetStateAction<Education[]>>;
}) {
  const [editing, setEditing] = useState<Education | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-inter">
        <div className="bg-white w-full max-w-2xl max-h-[86vh] rounded-2xl overflow-hidden border border-gray-100 shadow-2xl">

          {/* HEADER */}
          <div className="flex justify-between items-center bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Education
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                {education.length} {education.length === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditing(null);
                  setOpenForm(true);
                }}
                className="flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/15 text-white text-xs md:text-sm rounded-lg font-medium ring-1 ring-white/25 hover:bg-white/25"
              >
                <Plus size={14} className="md:w-4 md:h-4" />
                Add education
              </button>

              <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:bg-white/20 hover:text-white">
                <X />
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="max-h-[calc(86vh-7.5rem)] overflow-y-auto bg-slate-50 p-6 space-y-3">
            {education.map((edu) => (
              <div
                key={edu.id}
                className={`border border-gray-100 rounded-xl bg-white p-4 flex justify-between shadow-sm transition hover:border-blue-200 hover:shadow-md ${
                  deletingId === edu.id ? "opacity-60" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-900 truncate">
                    {edu.school}
                  </p>

                  <p className="text-sm text-gray-800">
                    {edu.degree} · {edu.fieldOfStudy}
                  </p>

                  <p className="text-sm text-gray-600 mt-1">
                    {MONTHS[edu.startMonth]} {edu.startYear} –{" "}
                    {MONTHS[edu.endMonth]} {edu.endYear} 
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      if (deletingId === edu.id) return;
                      setEditing(edu);
                      setOpenForm(true);
                    }}
                    disabled={deletingId === edu.id}
                    className="p-2 rounded-full hover:bg-gray-100  disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Pencil size={16} className="text-gray-600" />
                  </button>

                  <button
                    onClick={async () => {
                      if (deletingId === edu.id) return;
                      setDeletingId(edu.id);
                      try {
                        const res = await fetch(
                          DELETE_EDUCATION_API_PATH + `/${edu.id}`,
                          {
                            method: "DELETE",
                            credentials: "include",
                          }
                        );

                        if (!res.ok) throw new Error("Delete failed");

                        setEducation((prev) =>
                          prev.filter((e) => e.id !== edu.id)
                        );
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === edu.id}
                    className="p-2 rounded-full hover:bg-red-50  disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <AddEditEducationModal
        open={openForm}
        initial={editing}
        onClose={() => setOpenForm(false)}
        onSave={async (data) => {
          if (editing) {
            const res = await fetch(
              //TODO:put the route in constant
              `${BASE_API_PATH}/profile/me/update/educationFields/${editing.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              }
            );

            const updated = await res.json();

            setEducation((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          } else {
            const res = await fetch(ADD_EDUCATION_API_PATH, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });

            const created = await res.json();

            setEducation((prev) => [created, ...prev]);
          }
        }}
      />
    </>
  );
}
