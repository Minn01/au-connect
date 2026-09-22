"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Tags, X } from "lucide-react";

import SkillSelector, { type SkillOption } from "@/app/components/SkillSelector";
import {
  MAX_PROFILE_SKILLS,
  MY_PROFILE_SKILLS_API_PATH,
  PROFILE_SKILLS_API_PATH,
} from "@/lib/constants";
import SectionCard from "./SectionCard";

export default function ProfileSkillsSection({
  userId,
  initialSkills,
  canEdit,
}: {
  userId: string;
  initialSkills: SkillOption[];
  canEdit: boolean;
}) {
  const [skills, setSkills] = useState(initialSkills);
  const [draft, setDraft] = useState(initialSkills);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSkills = useCallback(async () => {
    try {
      const response = await fetch(PROFILE_SKILLS_API_PATH(userId), {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as { skills?: SkillOption[] };
      if (Array.isArray(data.skills)) {
        setSkills(data.skills);
        setDraft(data.skills);
      }
    } catch {
      // Keep the server-rendered skills when a refresh is unavailable.
    }
  }, [userId]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(MY_PROFILE_SKILLS_API_PATH, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: draft.map(({ id }) => id) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save skills");
      const savedSkills = Array.isArray(data.skills) ? data.skills : draft;
      setSkills(savedSkills);
      setDraft(savedSkills);
      setEditing(false);
      void loadSkills();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save skills",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SectionCard
        title="Skills"
        icon={
          canEdit && (
            <button
              type="button"
              onClick={() => {
                setDraft(skills);
                setError("");
                setEditing(true);
              }}
              className="rounded-full p-2 text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Edit skills"
            >
              <Pencil size={18} />
            </button>
          )
        }
      >
        {skills.length ? (
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, MAX_PROFILE_SKILLS).map((skill) => (
              <span
                key={skill.id}
                className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <Tags size={17} className="mt-0.5 shrink-0 text-red-700" />
            <p>
              {canEdit
                ? "Add skills to improve your job recommendations."
                : "No skills added yet."}
            </p>
          </div>
        )}
      </SectionCard>

      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="skills-dialog-title"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 bg-gradient-to-r from-red-50 to-white px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <span className="mt-0.5 rounded-xl bg-red-700 p-2 text-white shadow-sm">
                  <Tags size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="skills-dialog-title"
                    className="text-lg font-bold text-slate-950"
                  >
                    Add your skills
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Choose the skills, tools, and roles that best describe you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Close skills editor"
                className="rounded-full p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-5 py-5 sm:px-6">
              <div className="mb-2 flex items-end justify-between gap-4">
                <label className="text-sm font-semibold text-slate-800">
                  Search and select skills
                </label>
                <span className="text-xs font-medium text-slate-500">
                  {draft.length} of {MAX_PROFILE_SKILLS} selected
                </span>
              </div>
              <SkillSelector
                selected={draft}
                onChange={setDraft}
                maxSelected={MAX_PROFILE_SKILLS}
                layout="suggestions"
              />
              {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-red-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save skills"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
