import { X } from "lucide-react";

export default function PostDetailsSkeleton({
  onClose = () => {},
  sizeVariant = "compact",
  showLeftPane = false,
}: {
  onClose?: () => void;
  sizeVariant?: "job" | "media" | "compact";
  showLeftPane?: boolean;
}) {
  const maxWidth =
    sizeVariant === "job" ? "1300px" : sizeVariant === "media" ? "1100px" : "576px";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center px-4 pb-4 pt-16 md:py-8 md:pl-8 md:pr-20"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close post details"
        className="absolute right-4 top-4 z-[60] flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 md:right-8 md:top-8"
      >
        <X className="h-7 w-7" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full ${
          sizeVariant === "job"
            ? "max-w-[1100px]"
            : sizeVariant === "media"
              ? "max-w-6xl"
              : "max-w-xl"
        } h-[calc(100vh-5rem)] rounded-lg flex overflow-hidden md:h-[calc(100vh-4rem)]`}
        style={{ display: "flex", maxWidth }}
      >
        <div className="hidden md:flex w-full h-full min-h-0">
          {showLeftPane && (
            <div
              style={{
                width: "65%",
                minWidth: 0,
                flexShrink: 0,
                display: "flex",
                minHeight: 0,
                backgroundColor: "#111827",
              }}
              className="animate-pulse p-6 items-center justify-center"
            >
              <div className="w-full space-y-4">
                <div className="h-6 w-2/3 rounded bg-gray-700" />
                <div className="h-4 w-1/2 rounded bg-gray-700" />
                <div className="h-64 w-full rounded bg-gray-800" />
              </div>
            </div>
          )}

          <div
            style={{
              width: showLeftPane ? "35%" : "100%",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "hidden",
              borderLeft: showLeftPane ? "1px solid #e5e7eb" : "none",
            }}
            className="animate-pulse"
          >
            <div className="flex items-center gap-3 p-4 border-b">
              <div className="w-10 h-10 bg-gray-300 rounded-full" />
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 bg-gray-300 rounded" />
                <div className="h-2 w-16 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="px-4 py-3 space-y-3 border-b">
              <div className="h-4 w-3/4 bg-gray-300 rounded" />
              <div className="h-3 w-full bg-gray-200 rounded" />
              <div className="h-3 w-5/6 bg-gray-200 rounded" />
            </div>
            <div className="flex-1 p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 bg-gray-300 rounded" />
                    <div className="h-3 w-full bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3">
              <div className="h-9 w-full bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex md:hidden flex-col w-full animate-pulse">
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="w-10 h-10 bg-gray-300 rounded-full" />
            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 bg-gray-300 rounded" />
              <div className="h-2 w-16 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="px-4 py-3 space-y-3 border-b">
            <div className="h-4 w-3/4 bg-gray-300 rounded" />
            <div className="h-3 w-full bg-gray-200 rounded" />
          </div>
          <div className="flex-1 p-4 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-gray-300 rounded" />
                  <div className="h-3 w-full bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="h-9 w-full bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
