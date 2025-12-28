export default function PostContentSection({
  title,
  content,
}: {
  title?: string | null;
  content?: string;
}) {
  if (!title && !content) return null;

  return (
    <div className="border-b px-4 py-3 space-y-2">
      {title && (
        <h2 className="font-semibold text-gray-900">
          {title}
        </h2>
      )}

      {content && (
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {content}
        </p>
      )}
    </div>
  );
}
