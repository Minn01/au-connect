import { ExternalLink, X } from "lucide-react";
import LinkEmbed from "@/types/LinkEmbeds";

type LinkEmbedPreviewProps = {
  links: LinkEmbed[];
  onRemove?: (index: number) => void; // Optional - only shown in edit mode
  editable?: boolean;
};

export default function LinkEmbedPreview({
  links,
  onRemove,
  editable = false,
}: LinkEmbedPreviewProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className="mt-5 px-5 pb-4 space-y-3">
      {links.map((link, index) => (
        <div
          key={index}
          className="relative border border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* Preview Image (if available) */}
            {link.image && (
              <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={link.image}
                  alt={link.title || "Link preview"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Hide image if it fails to load
                    e.currentTarget.parentElement!.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Link Content */}
            <div className="p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Site Name / Favicon */}
                  {link.siteName && (
                    <div className="flex items-center gap-2 mb-2">
                      {link.favicon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={link.favicon}
                          alt=""
                          className="w-4 h-4"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {link.siteName}
                      </span>
                    </div>
                  )}

                  {/* User-Provided Title */}
                  <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {link.title}
                  </h3>

                  {/* Auto-fetched Description */}
                  {link.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {link.description}
                    </p>
                  )}

                  {/* URL Display */}
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {new URL(link.url).hostname}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </a>

          {/* Remove Button (only in edit mode) */}
          {editable && onRemove && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onRemove(index);
              }}
              className="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg z-10"
              title="Remove link"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
