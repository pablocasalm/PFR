import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import Input from "../../components/ui/Input"
import VideoFeed from "../../components/video/VideoFeed"
import VideoRow from "../../components/video/VideoRow"
import { getClips } from "../../lib/api/clips"
import { tags as mockTags } from "../../lib/mocks/tags"
import TagChipsBar from "../../components/tags/TagChipsBar"
import Badge from "../../components/ui/Badge"
import { buttonClasses } from "../../components/ui/Button"
import PageShell from "../../components/layout/PageShell"

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
  const featuredClip = clips[0]
  const miniaturas = [
    "/Mniaturas/GalanChingo.TapiaCoello.png",
    "/Mniaturas/LebronAusburger.TapiaCoello.png",
    "/Mniaturas/Miniatura_Galan.Chingotto-vs-Tello.Alonso.PNG",
    "/Mniaturas/Miniatura_Sanchez.Josemaria-vs-Castello.Rufo.png",
    "/Mniaturas/SanchezJosemaria.GonzalezFernandez.png",
    "/Mniaturas/SanchezJosemaria.OrtegaIcardo.png",
    "/Mniaturas/TriayBrea.OrtegaIcardo.png",
    "/Mniaturas/TriayBrea.SanchezJosemaria.png",
    "/Mniaturas/UsteroAraujo.OrtgeaIcardo.png",
    "/Mniaturas/YanguasNieto.GalanChingo.png",
    "/Mniaturas/YanguasNieto.TapiaCoello.png",
  ]
  const highlightedClips = clips.slice(0, 7).map((clip) => ({
    ...clip,
    thumbnailUrl: "/Colores/imagen.png",
  }))
  const analysisClips = clips.slice(7, 14).map((clip, index) => ({
    ...clip,
    thumbnailUrl: miniaturas[index % miniaturas.length],
  }))

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
        {featuredClip && (
          <section className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl aspect-[19/9] max-h-[600px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('/Mniaturas/Miniatura_Galan.Chingotto-vs-Tello.Alonso.PNG')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-6 p-6 md:p-10">
              <div className="flex items-center gap-3">
                <Badge variant="solid" className="bg-neon-lime text-midnight">
                  Destacado
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white/80">
                  {formatDuration(featuredClip.durationSeconds)}
                </Badge>
              </div>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-3xl font-semibold uppercase text-white md:text-4xl">
                  {featuredClip.title}
                </h2>
                <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                  {featuredClip.ideaKey}
                </p>
                {featuredClip.match && (
                  <p className="text-sm text-white/60">
                    {featuredClip.match.tournament.name} · {featuredClip.match.round}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/analisis/${featuredClip.id}`} className={buttonClasses("primary")}>
                  Partido completo
                </Link>
                <Link to={`/clip/${featuredClip.id}`} className={buttonClasses("secondary")}>
                  Reproducir clip
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="group space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Clips destacados</h3>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-lime">
              Ver todos
            </span>
          </div>
          <VideoRow clips={highlightedClips} cardTarget="clip" />
        </section>

        <section className="group space-y-5 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Analisis recientes</h3>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-lime">
              Ver todos
            </span>
          </div>
          <VideoRow clips={analysisClips} cardTarget="analysis" />
        </section>

        {filteredClips.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/60">
            No hay resultados para tu busqueda.
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
                  Busquedas recientes
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
