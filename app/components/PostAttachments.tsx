import { Download } from "lucide-react";
import { FILE_STYLES } from "@/lib/constants";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function PostAttachments({
  media,
  addMargin = false,
}: {
  media: {
    blobName: string;
    url: string;
    type: string;
    name?: string | undefined;
    mimetype?: string | undefined;
    size?: number | undefined;
  }[];
  addMargin?: boolean;
}) {
  if (!media || media.length === 0) return null;

  return (
    <div className={`px-5 pb-4 space-y-2 ${addMargin && "mt-5"}`}>
      <p className="text-sm font-medium text-gray-700">📎 Attachments</p>

      {media.map((file, index) => {
        const mimeType = file.mimetype ?? "";
        const style = FILE_STYLES[mimeType] ?? {
          label: "FILE",
          className: "bg-gray-100 text-gray-700",
        };

        return (
          <div
            key={file.blobName ?? `${file.url}-${index}`}
            className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
          >
            {/* Left side */}
            <div className="flex items-center gap-3 min-w-0">
              {/* File badge */}
              <div
                className={`px-2 py-1 rounded text-xs font-semibold ${style.className}`}
              >
                {style.label}
              </div>

              {/* File info */}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {file.name ?? "Untitled file"}
                </p>
                <p className="text-sm text-gray-500">
                  {file.size ? formatBytes(file.size) : "Unknown size"}
                </p>
              </div>
            </div>

            {/* Download */}
            <a
              href={file.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
