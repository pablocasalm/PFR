import { SlidersHorizontal, ArrowRight, ChevronRight, ChevronLeft, MoreVertical, LayoutGrid, ArrowLeftRight, Grip, ClipboardList, Clapperboard, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getExplore } from "../../../lib/api/explore"
import type { ContentItem, ExploreSection } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { Skeleton, CardSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import FilterPanel, { type FilterSection } from "../components/FilterPanel"
import WatchedBadge from "../components/WatchedBadge"

/**
 * Explorar — Biblioteca táctica. Consume GET /api/explore (bloques + análisis).
 *
 * Filtros (§ paso 4): estado en la propia página (cliente), sin pedir de nuevo al backend.
 *  - `type`: acota a clips o análisis.
 *  - `selected`: conjunto de conceptos. Se alimenta desde dos sitios que comparten estado:
 *      · el panel "Filtros" (lista global de conceptos), y
 *      · los chips in-situ de cada sección (clic para filtrar sin salir de Explorar).
 * El contenido se filtra en memoria y las secciones que quedan vacías se ocultan.
 */

type ContentType = "all" | "clips" | "analyses"

const ACCENTS = [
  "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  "border-amber-400/40 bg-amber-400/10 text-amber-300",
  "border-violet-400/40 bg-violet-400/10 text-violet-300",
  "border-sky-400/40 bg-sky-400/10 text-sky-300",
]
const ICONS: LucideIcon[] = [LayoutGrid, ArrowLeftRight, Grip, ClipboardList]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const Thumb = ({ src, hue, className = "", completed = false }: { src?: string; hue: number; className?: string; completed?: boolean }) => (
  <div className={`relative overflow-hidden ${className}`} style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    {completed && <WatchedBadge />}
  </div>
)

/** Chip de concepto. Clicable cuando recibe onClick; se resalta si está activo (filtro puesto). */
const Chip = ({ children, active = false, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border px-3 py-1 text-xs transition ${
      active
        ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan"
        : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
    }`}
  >
    #{children}
  </button>
)

// Desplegable con autosugerencia sobre los jugadores ya presentes en el catálogo (§reporte de
// beta #21): al enfocar sin texto se ve la lista completa (orden alfabético); al escribir, se
// filtra por coincidencia.
const PlayerFilter = ({
  players,
  selected,
  onSelect,
}: {
  players: string[]
  selected: string
  onSelect: (player: string) => void
}) => {
  const [query, setQuery] = useState(selected)
  const [open, setOpen] = useState(false)

  useEffect(() => setQuery(selected), [selected])

  const options = query.trim()
    ? players.filter((p) => p.toLowerCase().includes(query.trim().toLowerCase()))
    : players

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Jugador</span>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (selected) onSelect("")
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            if (selected) setQuery("")
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar jugador..."
          className="w-full rounded-lg border border-white/15 bg-midnight px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none"
        />
        {selected && (
          <button
            type="button"
            aria-label="Quitar filtro de jugador"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {open && options.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/15 bg-midnight shadow-lg">
            {options.map((p) => (
              <button
                key={p}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const VerTodo = ({ to }: { to: string }) => (
  <Link to={to} className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
    Ver todo <ArrowRight className="h-4 w-4" />
  </Link>
)

// Solo escritorio: en móvil el carrusel ya se navega con scroll táctil.
const CarouselArrow = ({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) => (
  <button
    onClick={onClick}
    aria-label={direction === "left" ? "Ver clips anteriores" : "Ver más clips"}
    className={`absolute top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90 md:flex ${
      direction === "left" ? "-left-2" : "-right-2"
    }`}
  >
    {direction === "left" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
  </button>
)

// Fila de clips de un bloque: scroll horizontal en TODAS las resoluciones (a diferencia de
// CardRow, que en escritorio pasa a rejilla) para que las flechas tengan algo que desplazar.
const ClipCarouselRow = ({ clips, block }: { clips: ContentItem[]; block: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const scrollByPage = (direction: 1 | -1) => {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.9, behavior: "smooth" })
  }
  return (
    <div className="relative">
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-1">
        {clips.map((clip) => (
          <div key={clip.id} className="w-[40vw] shrink-0 snap-start sm:w-56 lg:w-64">
            <ClipCard clip={clip} currentBlock={block} />
          </div>
        ))}
      </div>
      <CarouselArrow direction="left" onClick={() => scrollByPage(-1)} />
      <CarouselArrow direction="right" onClick={() => scrollByPage(1)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

// currentBlock: bloque de la sección donde se muestra el clip. Sus conceptos van en color;
// los de otros bloques, en gris (para que se entienda que son de otro contexto, §8.3).
const ClipCard = ({ clip, currentBlock }: { clip: ContentItem; currentBlock: string }) => {
  const blockConcepts = new Set(clip.blocks?.find((b) => b.block === currentBlock)?.concepts ?? [])
  return (
    <Link to={watchHref(clip)} className="group block cursor-pointer">
      <div className="relative overflow-hidden rounded-lg border border-white/10">
        <Thumb src={clip.thumbnailUrl} hue={hueFor(clip.id)} className="aspect-video w-full" completed={clip.completed} />
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {formatDuration(clip.durationSeconds)}
        </span>
        <span className="absolute right-2 top-2">
          <SaveButton item={clip} variant="icon" />
        </span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-white">{clip.title}</p>
          <div className="mt-1 flex flex-wrap gap-x-2 text-xs leading-relaxed">
            {clip.concepts.slice(0, 4).map((c) => (
              <span key={c} className={blockConcepts.has(c) ? "text-neon-cyan/90" : "text-white/35"}>
                #{c}
              </span>
            ))}
          </div>
        </div>
        <span className="mt-0.5 shrink-0 text-white/40"><MoreVertical className="h-4 w-4" /></span>
      </div>
    </Link>
  )
}

const ConceptSection = ({
  section,
  index,
  selected,
  onToggleConcept,
}: {
  section: ExploreSection
  index: number
  selected: Set<string>
  onToggleConcept: (concept: string) => void
}) => {
  const Icon = ICONS[index % ICONS.length]
  const accent = ACCENTS[index % ACCENTS.length]
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-5">
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accent}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-[0.12em] text-white">{section.block}</h2>
          <VerTodo to={`/app/search?block=${encodeURIComponent(section.block)}`} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {section.concepts.map((c) => (
            <Chip key={c} active={selected.has(c)} onClick={() => onToggleConcept(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <ClipCarouselRow clips={section.clips} block={section.block} />
    </section>
  )
}

const AnalisisCard = ({ item }: { item: ContentItem }) => (
  <Link to={watchHref(item)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20">
    <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-28 shrink-0 rounded-lg" completed={item.completed} />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        {item.tournament}
        {item.tournament && item.players ? " · " : ""}
        {item.players}
      </p>
    </div>
    <span className="shrink-0 self-start" onClick={(e) => e.preventDefault()}>
      <SaveButton item={item} variant="icon" />
    </span>
  </Link>
)

const TYPE_LABELS: Record<ContentType, string> = { all: "Todos", clips: "Clips", analyses: "Análisis" }

/** Esqueleto de la biblioteca: dos secciones de concepto con su rejilla de tarjetas. */
const ExplorarSkeleton = () => (
  <div className="space-y-6">
    {Array.from({ length: 2 }).map((_, s) => (
      <section key={s} className="space-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded" />
        </div>
        <CardRow cols="sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </CardRow>
      </section>
    ))}
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Explorar = () => {
  const { data, loading, error } = useApi(getExplore, [], "explore")

  const [showFilters, setShowFilters] = useState(false)
  const [type, setType] = useState<ContentType>("all")
  const [selectedBlock, setSelectedBlock] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedPlayer, setSelectedPlayer] = useState("")

  const toggleConcept = (concept: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(concept) ? next.delete(concept) : next.add(concept)
      return next
    })
  const clear = () => {
    setSelected(new Set())
    setType("all")
    setSelectedBlock("")
    setSelectedPlayer("")
  }

  // Lista global de conceptos para el panel (bloques + análisis), ordenada y sin repetir.
  const allConcepts = useMemo(() => {
    const s = new Set<string>()
    data?.sections.forEach((sec) => sec.concepts.forEach((c) => s.add(c)))
    data?.analyses.forEach((a) => a.concepts.forEach((c) => s.add(c)))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [data])

  // Jugadores únicos (campo "players" es un CSV: "Agus Tapia, Arturo Coello, ..."), alfabético.
  const allPlayers = useMemo(() => {
    const s = new Set<string>()
    const addFrom = (csv?: string) => csv?.split(",").forEach((p) => p.trim() && s.add(p.trim()))
    data?.sections.forEach((sec) => sec.clips.forEach((c) => addFrom(c.players)))
    data?.analyses.forEach((a) => addFrom(a.players))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [data])

  const conceptActive = selected.size > 0
  const matches = (concepts: string[]) => !conceptActive || concepts.some((c) => selected.has(c))
  const matchesPlayer = (players?: string) =>
    !selectedPlayer || (players ?? "").split(",").map((p) => p.trim()).includes(selectedPlayer)

  // Un clip puede tener el mismo concepto en distintos bloques (raro, pero posible) o aparecer
  // en varias secciones porque tiene otros bloques propios: el filtro de un concepto debe mirar
  // SOLO los conceptos de ESE bloque, no la lista plana del clip — si no, un concepto de un
  // bloque "cuela" al clip en otras secciones donde ese concepto ni siquiera aplica (reporte de
  // beta: el hashtag aparecía en gris en secciones donde no pintaba nada).
  const matchesInBlock = (clip: ContentItem, block: string) => {
    if (!conceptActive) return true
    const scoped = clip.blocks?.find((b) => b.block === block)?.concepts ?? []
    return scoped.some((c) => selected.has(c))
  }

  // Clips: filtra por bloque + concepto + jugador y descarta las secciones vacías.
  const visibleSections = useMemo(() => {
    if (type === "analyses" || !data) return []
    return data.sections
      .filter((sec) => !selectedBlock || sec.block === selectedBlock)
      .map((sec) => ({
        ...sec,
        clips: sec.clips.filter((cl) => matchesInBlock(cl, sec.block) && matchesPlayer(cl.players)),
      }))
      .filter((sec) => sec.clips.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, selectedBlock, selected, selectedPlayer])

  const visibleAnalyses = useMemo(() => {
    if (type === "clips" || !data) return []
    return data.analyses.filter((a) => matches(a.concepts) && matchesPlayer(a.players))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, selected, selectedPlayer])

  // Secciones del panel de filtros compartido (mismo componente que Search/Resultados).
  const filterSections: FilterSection[] = [
    {
      title: "Tipo",
      options: (Object.keys(TYPE_LABELS) as ContentType[]).map((t) => ({ value: t, label: TYPE_LABELS[t] })),
      isActive: (v) => type === v,
      onToggle: (v) => setType(v as ContentType),
    },
    {
      title: "Bloque",
      options: (data?.sections ?? []).map((sec) => ({ value: sec.block, label: sec.block })),
      isActive: (v) => selectedBlock === v,
      onToggle: (v) => setSelectedBlock((prev) => (prev === v ? "" : v)),
    },
    {
      title: "Conceptos",
      options: allConcepts.map((c) => ({ value: c, label: `#${c}` })),
      isActive: (v) => selected.has(v),
      onToggle: toggleConcept,
    },
  ]

  const activeCount =
    selected.size + (type !== "all" ? 1 : 0) + (selectedBlock ? 1 : 0) + (selectedPlayer ? 1 : 0)
  const noResults = !!data && !loading && visibleSections.length === 0 && visibleAnalyses.length === 0

  return (
    <main className="w-full space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Explorar</h1>
          <p className="mt-2 text-sm text-white/60">
            Encuentra los mejores ejemplos de pádel organizados por conceptos clave.
          </p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
            showFilters || activeCount > 0
              ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
              : "border-white/15 text-white hover:bg-white/5"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-cyan px-1.5 text-[11px] font-bold text-midnight">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filtros: en escritorio en línea; en móvil, hoja inferior (mismo patrón que Comentarios en Video). */}
      {showFilters && (
        <div className="hidden space-y-4 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <PlayerFilter players={allPlayers} selected={selectedPlayer} onSelect={setSelectedPlayer} />
          </div>
          <FilterPanel sections={filterSections} onClear={clear} showClear={activeCount > 0} />
        </div>
      )}

      <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filtros">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <PlayerFilter players={allPlayers} selected={selectedPlayer} onSelect={setSelectedPlayer} />
          </div>
          <FilterPanel sections={filterSections} onClear={clear} showClear={activeCount > 0} />
        </div>
      </BottomSheet>

      {loading && <ExplorarSkeleton />}
      {error && (
        <p className="text-sm text-red-400/80">No se pudo cargar Explorar ({error}). ¿Está el backend en marcha?</p>
      )}

      {noResults && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/60">No hay resultados para estos filtros.</p>
          <button onClick={clear} className="mt-3 text-sm font-medium text-neon-cyan transition hover:brightness-110">
            Limpiar filtros
          </button>
        </div>
      )}

      {visibleSections.map((section, i) => (
        <ConceptSection key={section.block} section={section} index={i} selected={selected} onToggleConcept={toggleConcept} />
      ))}

      {visibleAnalyses.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-3 sm:p-5">
          <div className="mb-5 flex items-center gap-3">
            {/* Icono y color propios, fuera de la paleta que ciclan los bloques (§reporte de
                beta: costaba diferenciar análisis de conceptos por tener el mismo aspecto). */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-lime/40 bg-neon-lime/10 text-neon-lime">
              <Clapperboard className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Análisis completos</h2>
            <div className="ml-auto">
              <VerTodo to="/app/search?type=analysis" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleAnalyses.map((item) => (
              <AnalisisCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default Explorar
