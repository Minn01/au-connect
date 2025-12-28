"use client";
import { SendHorizontal } from "lucide-react";
import { useState } from "react";

export default function CommentInput({
  isLoading,
  onSubmit,
  placeholder = "Add a comment...",
}: {
  isLoading?: boolean;
  onSubmit: (text: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none text-sm text-gray-900 outline-none bg-transparent"
      />

      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className={`text-sm font-semibold ${
          text.trim()
            ? "text-blue-500 hover:text-blue-600 cursor-pointer"
            : "text-gray-400 hover:text-gray-500 cursor-default"
        }`}
      >
        <SendHorizontal />
      </button>
    </div>
  );
}
