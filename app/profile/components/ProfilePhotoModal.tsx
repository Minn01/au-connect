"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { X, Trash2 } from "lucide-react";

import User from "@/types/User";
import ProfilePhotoCropModal from "@/app/profile/components/ProfilePhotoCropModal";
import { uploadFile } from "@/app/profile/utils/uploadMedia";

type ProfilePhotoModalProps = {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  user: User;
  resolvedProfilePicUrl: string;
  onProfilePicChanged: (newProfilePicValue: string) => void;
};

const DEFAULT_PROFILE_PIC = "/default_profile.jpg";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ProfilePhotoModal({
  open,
  onClose,
  isOwner,
  user,
  resolvedProfilePicUrl,
  onProfilePicChanged,
}: ProfilePhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null
  );
  const [openCrop, setOpenCrop] = useState(false);

  if (!open) return null;

  const showDelete =
    isOwner &&
    user.profilePic &&
    user.profilePic.trim() !== "" &&
    user.profilePic !== DEFAULT_PROFILE_PIC;

  function resetSelection() {
    setSelectedFile(null);
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    setSelectedPreviewUrl(null);
    setOpenCrop(false);
  }

  function pickFile() {
    setError("");
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");

    const file = e.target.files?.[0];
    e.target.value = ""; // allow reselect same file

    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, WEBP are allowed.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("File too large. Max is 5MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setSelectedPreviewUrl(url);
    setOpenCrop(true);
  }

  async function handleDelete() {
    try {
      setBusy(true);
      setError("");

      const res = await fetch("/api/connect/v1/profile/me/delete/profilePic", {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Delete failed");

      onProfilePicChanged(DEFAULT_PROFILE_PIC);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCropped(result: {
    croppedFile: File;
    profilePicCrop: any;
  }) {
    if (!selectedFile) return;

    try {
      setBusy(true);
      setError("");

      // 1) upload original to azure
      const originalUpload = await uploadFile(selectedFile);

      // 2) upload cropped 512x512 to azure
      const croppedUpload = await uploadFile(result.croppedFile);

      // 3) save in DB + delete old best-effort
      const res = await fetch("/api/connect/v1/profile/me/upload/profilePic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalBlobName: originalUpload.blobName,
          croppedBlobName: croppedUpload.blobName,
          profilePicCrop: result.profilePicCrop,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save profile photo failed");

      // Update ProfileView’s local state (blobName or default path)
      onProfilePicChanged(croppedUpload.blobName);

      resetSelection();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!busy) {
            resetSelection();
            onClose();
          }
        }}
      />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-lg p-6 text-gray-900">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile photo</h2>
          <button
            onClick={() => {
              if (!busy) {
                resetSelection();
                onClose();
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
            type="button"
            disabled={busy}
          >
            <X size={18} className="text-gray-700" />
          </button>
        </div>

        {/* AVATAR PREVIEW */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-48">
            <Image
              src={resolvedProfilePicUrl}
              alt={`${user.username}'s profile photo`}
              fill
              className="rounded-full object-cover border"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg p-2">
            {error}
          </div>
        )}

        {/* ACTIONS */}
        {isOwner && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={pickFile}
              disabled={busy}
              className="w-full px-4 py-2 border rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy ? "Please wait..." : "Upload new photo"}
            </button>

            {showDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="w-full px-4 py-2 border border-red-500 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Delete photo
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}

        {/* CROP MODAL */}
        <ProfilePhotoCropModal
          open={openCrop}
          imageUrl={selectedPreviewUrl}
          initialCrop={user.profilePicCrop ?? null}
          onCancel={() => {
            if (!busy) resetSelection();
          }}
          onSave={handleSaveCropped}
          busy={busy}
        />
      </div>
    </div>
  );
}
