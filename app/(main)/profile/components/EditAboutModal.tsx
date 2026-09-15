"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateAbout } from "../[slug]/hook/updateAbout"; 

export default function EditAboutModal({
  open,
  onClose,
  initialAbout,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialAbout: string;
  onSaved: (newAbout: string) => void;
}) {
  const [about, setAbout] = useState(initialAbout || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

	  useEffect(() => {
	    if (open) {
	      // eslint-disable-next-line react-hooks/set-state-in-effect
	      setAbout(initialAbout || "");
      setError("");
      setSaving(false);
    }
  }, [open, initialAbout]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      await updateAbout(about); //  ONLY UPDATE ABOUT
      onSaved(about);           // update UI immediately
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update about");
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 text-white">
          <div>
            <h2 className="text-xl font-bold text-white">Edit about</h2>
            <p className="mt-1 text-sm text-blue-100">
              Share a short intro for your profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-3">
            You can write about your years of experience, industry, or skills.
            People also talk about their achievements or previous job experiences.
          </p>

          {error && (
            <p className="text-red-600 text-sm mb-3 font-medium">
              {error}
            </p>
          )}

          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="w-full min-h-[260px] border border-gray-300 rounded-lg p-3 
                       text-gray-900 placeholder-gray-500 
                       focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Tell people about yourself"
            maxLength={2600}
          />

          <div className="text-right text-xs text-gray-500 mt-2">
            {about.length}/2,600
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 
                       text-gray-700 hover:bg-gray-100 font-medium "
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg 
                       font-medium hover:bg-blue-700 disabled:bg-blue-300 "
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}
