import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type BookmarkContextValue = {
  bookmarkIds: string[]
  isBookmarked: (id: string) => boolean
  toggleBookmark: (id: string) => void
}

const BOOKMARK_STORAGE_KEY = "pfr_bookmarks_v1"

const readBookmarks = (): string[] => {
  const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const BookmarkContext = createContext<BookmarkContextValue | null>(null)

export const BookmarkProvider = ({ children }: { children: ReactNode }) => {
  const [bookmarkSet, setBookmarkSet] = useState(() => new Set(readBookmarks()))

  const toggleBookmark = (id: string) => {
    setBookmarkSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      const values = Array.from(next)
      localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(values))
      return next
    })
  }

  const value = useMemo(
    () => ({
      bookmarkIds: Array.from(bookmarkSet),
      isBookmarked: (id: string) => bookmarkSet.has(id),
      toggleBookmark,
    }),
    [bookmarkSet],
  )

  return <BookmarkContext.Provider value={value}>{children}</BookmarkContext.Provider>
}

export const useBookmarks = () => {
  const context = useContext(BookmarkContext)
  if (!context) {
    throw new Error("useBookmarks debe usarse dentro de BookmarkProvider")
  }
  return context
}
