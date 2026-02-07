import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import Input from "../../components/ui/Input"
import VideoRow from "../../components/video/VideoRow"
import { getClips, getClipsByIds } from "../../lib/api/clips"
import { tags as mockTags } from "../../lib/mocks/tags"
import TagChipsBar from "../../components/tags/TagChipsBar"
import Badge from "../../components/ui/Badge"
import { buttonClasses } from "../../components/ui/Button"
import PageShell from "../../components/layout/PageShell"
import { explorarSections } from "../../data/explorarSections"
import { featuredCarouselItems } from "../../data/featuredCarousel"
import { getCollections } from "../../lib/api/collections"
import CollectionsRow from "../../components/collections/CollectionsRow"

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const Explorar = () => {
  const [query, setQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const modalInputRef = useRef<HTMLInputElement | null>(null)
  const clips = getClips()
  const carouselClips = useMemo(() => {
    const selected = getClipsByIds(featuredCarouselItems.map((item) => item.id))
    const selectedWithThumbs = selected.map((clip) => {
      const match = featuredCarouselItems.find((item) => item.id === clip.id)
      return match?.thumbnailUrl ? { ...clip, thumbnailUrl: match.thumbnailUrl } : clip
    })
    const base = selectedWithThumbs.length > 0 ? selectedWithThumbs : clips
    return base.slice(0, 5)
  }, [clips])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const collections = getCollections()
  const collectionsBySlug = new Map(collections.map((collection) => [collection.slug, collection]))
  const sections = explorarSections.map((section) => {
    if (section.cardTarget === "collection") {
      const sectionCollections =
        section.collectionSlugs?.map((slug) => collectionsBySlug.get(slug)).filter(Boolean) ?? []
      return { ...section, collections: sectionCollections }
    }
    const baseClips = getClipsByIds(section.clipIds ?? [])
    const clipsWithThumbnails = baseClips.map((clip, index) => ({
      ...clip,
      thumbnailUrl:
        section.thumbnailUrlOverride ??
        section.thumbnailUrlsByIndex?.[index] ??
        clip.thumbnailUrl,
    }))
    return { ...section, clips: clipsWithThumbnails }
  })

  useEffect(() => {
    setCarouselIndex(0)
  }, [carouselClips.length])

  useEffect(() => {
    if (carouselClips.length <= 1) {
      return undefined
    }
    const timeout = window.setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselClips.length)
    }, 5000)
    return () => window.clearTimeout(timeout)
  }, [carouselClips.length, carouselIndex])

  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true)
    window.addEventListener("pfr:open-search", handleOpenSearch)
    return () => {
      window.removeEventListener("pfr:open-search", handleOpenSearch)
    }
  }, [])

  useEffect(() => {
    if (isSearchOpen) {
      modalInputRef.current?.focus()
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
    return undefined
  }, [isSearchOpen])

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

    return tagFiltered
  }, [clips, query, selectedTags])

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((tag) => tag !== slug) : [...prev, slug],
    )
  }

  const resetTags = () => setSelectedTags([])

  const handleSearchSubmit = () => {
    const normalized = query.trim()
    if (!normalized) {
      return
    }
    setRecentSearches((prev) => {
      const next = [normalized, ...prev.filter((item) => item !== normalized)]
      return next.slice(0, 5)
    })
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleSearchSubmit()
      setIsSearchOpen(false)
    }
  }

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-10">
        {carouselClips.length > 0 && (
          <section className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl aspect-[19/9] max-h-[600px]">
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="flex h-full w-full transition-transform ease-linear"
                style={{
                  transform: `translateX(-${carouselIndex * 100}%)`,
                  transitionDuration: "1400ms",
                }}
              >
                {carouselClips.map((clip) => (
                  <div key={clip.id} className="relative h-full w-full flex-none">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${clip.thumbnailUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="relative flex h-full flex-col gap-6 p-6 md:p-10">
                      <div className="flex items-center gap-3">
                        <Badge variant="solid" className="bg-neon-lime text-midnight">
                          Destacado
                        </Badge>
                        <Badge variant="outline" className="border-white/30 text-white/80">
                          {formatDuration(clip.durationSeconds)}
                        </Badge>
                      </div>
                      <div className="max-w-2xl space-y-3">
                        <h2 className="text-3xl font-semibold uppercase text-white md:text-4xl">
                          {clip.title}
                        </h2>
                        <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                          {clip.ideaKey}
                        </p>
                        {clip.match && (
                          <p className="text-sm text-white/60">
                            {clip.match.tournament.name} · {clip.match.round}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Link to={`/video/${clip.id}`} className={buttonClasses("primary")}>
                          Partido completo
                        </Link>
                        <Link to={`/clip/${clip.id}`} className={buttonClasses("secondary")}>
                          Reproducir clip
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {carouselClips.length > 1 && (
              <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
                {carouselClips.map((clip, index) => (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => setCarouselIndex(index)}
                    className={`h-2 w-2 rounded-full transition ${
                      index === carouselIndex ? "bg-neon-lime" : "bg-white/30 hover:bg-white/60"
                    }`}
                    aria-label={`Ir al destacado ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        {sections.map((section) => (
          <section key={section.id} className={`group space-y-5 ${section.className ?? ""}`}>
            <div className="flex items-center justify-between">
              {section.cardTarget === "collection" ? (
                <Link
                  to="/app/colecciones"
                  className="text-lg font-semibold text-white hover:underline"
                  aria-label="Ir a colecciones"
                >
                  {section.title}
                </Link>
              ) : (
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
              )}
            </div>
            {section.cardTarget === "collection" ? (
              <CollectionsRow collections={section.collections ?? []} />
            ) : (
              <VideoRow clips={section.clips ?? []} cardTarget={section.cardTarget} />
            )}
          </section>
        ))}

        {filteredClips.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            No hay resultados para tu búsqueda.
          </div>
        )}
      </PageShell>
      {isSearchOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-2xl"
            onClick={() => setIsSearchOpen(false)}
            aria-label="Cerrar buscador"
          />
          <div className="relative mx-auto mt-10 w-full max-w-3xl px-4">
            <div className="flex items-center justify-between">
              <Input
                ref={modalInputRef}
                type="search"
                placeholder="Buscar por jugada, jugador o idea..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-11 rounded-full bg-black/70 px-5 text-sm text-white placeholder:text-white/50"
              />
              <button
                type="button"
                className="ml-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Cerrar buscador"
              >
                ×
              </button>
            </div>
            {recentSearches.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Búsquedas recientes
                </p>
                <div className="flex flex-wrap gap-3">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/70 hover:bg-white/10"
                      onClick={() => {
                        setQuery(item)
                        setIsSearchOpen(false)
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6">
              <TagChipsBar
                tags={mockTags}
                selected={selectedTags}
                onToggle={toggleTag}
                onReset={resetTags}
                showArrows
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Explorar

