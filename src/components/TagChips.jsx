// Display-only tag chips. Editing is handled in EntryForm (step 9).
export function TagChips({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-mid-grey border border-light-grey"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
