import { useBookmarks } from "../../app/providers/BookmarkProvider"

type BookmarkButtonProps = {
  clipId: string
  className?: string
}

const BookmarkButton = ({ clipId, className = "" }: BookmarkButtonProps) => {
  const { isBookmarked, toggleBookmark } = useBookmarks()
  const saved = isBookmarked(clipId)

  return (
    <button
      type="button"
      onClick={() => toggleBookmark(clipId)}
      className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white transition-colors hover:bg-black/60 ${className}`}
      aria-pressed={saved}
      aria-label={saved ? "Quitar de guardados" : "Guardar clip"}
      title={saved ? "Quitar de guardados" : "Guardar clip"}
    >
      <svg viewBox="0 0 24 24" className={`h-5 w-5 ${saved ? "fill-current" : "fill-none"}`}>
        <path
          d="M6 4.5C6 3.12 7.12 2 8.5 2h7C16.88 2 18 3.12 18 4.5V22l-6-4-6 4V4.5z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  )
}

export default BookmarkButton
