import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Input from "../../components/ui/Input"
import VideoFeed from "../../components/video/VideoFeed"
import { getClips } from "../../lib/api/clips"
import { tags as mockTags } from "../../lib/mocks/tags"
import TagChipsBar from "../../components/tags/TagChipsBar"

const Explorar = () => {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortMode, setSortMode] = useState<"recent" | "top">("recent")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const clips = getClips()

  useEffect(() => {
    if (searchParams.get("focus") === "1") {
      inputRef.current?.focus()
    }
  }, [searchParams])

  const filteredClips = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const textFiltered = normalized
      ? clips.filter(
          (clip) =>
            clip.title.toLowerCase().includes(normalized) ||
            clip.ideaKey.toLowerCase().includes(normalized),
        )
      : clips

    const selectedSet = new Set(selectedTags)
    const tagFiltered =
      selectedTags.length === 0
        ? textFiltered
        : textFiltered.filter((clip) => (clip.tags ?? []).some((tag) => selectedSet.has(tag)))

    if (sortMode === "top") {
      return [...tagFiltered].sort((a, b) => {
        const totalA =
          (a.reactionCounts?.fire ?? 0) +
          (a.reactionCounts?.hundred ?? 0) +
          (a.reactionCounts?.like ?? 0) +
          (a.reactionCounts?.boom ?? 0)
        const totalB =
          (b.reactionCounts?.fire ?? 0) +
          (b.reactionCounts?.hundred ?? 0) +
          (b.reactionCounts?.like ?? 0) +
          (b.reactionCounts?.boom ?? 0)
        return totalB - totalA
      })
    }

    return tagFiltered
  }, [clips, query, selectedTags, sortMode])

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((tag) => tag !== slug) : [...prev, slug],
    )
  }

  const resetTags = () => setSelectedTags([])

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Explorar</h1>
            <p className="text-base text-white/70">
              Encuentra clips por táctica, idea clave o jugada.
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <Input
              ref={inputRef}
              type="search"
              placeholder="Buscar…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TagChipsBar
            tags={mockTags}
            selected={selectedTags}
            onToggle={toggleTag}
            onReset={resetTags}
          />
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-white/70">
            <button
              type="button"
              onClick={() => setSortMode("recent")}
              className={`rounded-full px-3 py-1 transition-colors ${
                sortMode === "recent" ? "bg-white text-midnight" : "hover:text-white"
              }`}
            >
              Recientes
            </button>
            <button
              type="button"
              onClick={() => setSortMode("top")}
              className={`rounded-full px-3 py-1 transition-colors ${
                sortMode === "top" ? "bg-white text-midnight" : "hover:text-white"
              }`}
            >
              Más reaccionados
            </button>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          {selectedTags.length > 0 ? "Sugerido para ti" : "Todos los clips"}
        </p>
        {filteredClips.length > 0 ? (
          <VideoFeed
            clips={filteredClips}
            className="gap-4 sm:grid-cols-2 lg:grid-cols-3"
            showFullHint
            prioritizeFull
          />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            No hay resultados para tu búsqueda.
          </div>
        )}
      </section>
    </main>
  )
}

export default Explorar
