import { SlidersHorizontal, ArrowRight, ChevronRight, MoreVertical, LayoutGrid, ArrowLeftRight, Grip, ClipboardList } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getExplore } from "../../../lib/api/explore"
import type { ContentItem, ExploreSection } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"

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

const Thumb = ({ src, hue, className = "" }: { src?: string; hue: number; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`} style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
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

const VerTodo = ({ to }: { to: string }) => (
  <Link to={to} className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
    Ver todo <ArrowRight className="h-4 w-4" />
  </Link>
)

// Solo escritorio: en móvil se navega la rejilla con scroll táctil (y evita overflow horizontal).
const CarouselArrow = () => (
  <button className="absolute -right-2 top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90 md:flex">
    <ChevronRight className="h-5 w-5" />
  </button>
)

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
        <Thumb src={clip.thumbnailUrl} hue={hueFor(clip.id)} className="aspect-video w-full" />
        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {formatDuration(clip.durationSeconds)}
        </span>
        <span className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
          <SaveButton item={clip} variant="icon" />
        </span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{clip.title}</p>
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

      <div className="relative">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {section.clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} currentBlock={section.block} />
          ))}
        </div>
        <CarouselArrow />
      </div>
    </section>
  )
}

const AnalisisCard = ({ item }: { item: ContentItem }) => (
  <Link to={watchHref(item)} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20">
    <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-28 shrink-0 rounded-lg" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-white">{item.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/50">
        {item.tournament}
        {item.tournament && item.players ? " · " : ""}
        {item.players}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {item.concepts.slice(0, 3).map((c) => (
          <span key={c} className="text-[11px] text-neon-cyan/80">#{c}</span>
        ))}
      </div>
    </div>
    <span className="shrink-0 self-start" onClick={(e) => e.preventDefault()}>
      <SaveButton item={item} variant="icon" />
    </span>
  </Link>
)

// ---------------------------------------------------------------------------
// Panel de filtros
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ContentType, string> = { all: "Todos", clips: "Clips", analyses: "Análisis" }

const FiltersPanel = ({
  type,
  onType,
  concepts,
  selected,
  onToggleConcept,
  onClear,
}: {
  type: ContentType
  onType: (t: ContentType) => void
  concepts: string[]
  selected: Set<string>
  onToggleConcept: (concept: string) => void
  onClear: () => void
}) => (
  <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-white/50">Tipo</span>
      {(Object.keys(TYPE_LABELS) as ContentType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onType(t)}
          aria-pressed={type === t}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            type === t ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/70 hover:text-white"
          }`}
        >
          {TYPE_LABELS[t]}
        </button>
      ))}
    </div>

    {concepts.length > 0 && (
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">Conceptos</span>
        <div className="flex flex-wrap gap-2">
          {concepts.map((c) => (
            <Chip key={c} active={selected.has(c)} onClick={() => onToggleConcept(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>
    )}

    {(selected.size > 0 || type !== "all") && (
      <button type="button" onClick={onClear} className="text-xs font-medium text-white/60 underline-offset-2 transition hover:text-white hover:underline">
        Limpiar filtros
      </button>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Explorar = () => {
  const { data, loading, error } = useApi(getExplore, [])

  const [showFilters, setShowFilters] = useState(false)
  const [type, setType] = useState<ContentType>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleConcept = (concept: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(concept) ? next.delete(concept) : next.add(concept)
      return next
    })
  const clear = () => {
    setSelected(new Set())
    setType("all")
  }

  // Lista global de conceptos para el panel (bloques + análisis), ordenada y sin repetir.
  const allConcepts = useMemo(() => {
    const s = new Set<string>()
    data?.sections.forEach((sec) => sec.concepts.forEach((c) => s.add(c)))
    data?.analyses.forEach((a) => a.concepts.forEach((c) => s.add(c)))
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [data])

  const conceptActive = selected.size > 0
  const matches = (concepts: string[]) => !conceptActive || concepts.some((c) => selected.has(c))

  // Clips: filtra por concepto dentro de cada sección y descarta las secciones vacías.
  const visibleSections = useMemo(() => {
    if (type === "analyses" || !data) return []
    return data.sections
      .map((sec) => ({ ...sec, clips: sec.clips.filter((cl) => matches(cl.concepts)) }))
      .filter((sec) => sec.clips.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, selected])

  const visibleAnalyses = useMemo(() => {
    if (type === "clips" || !data) return []
    return data.analyses.filter((a) => matches(a.concepts))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, type, selected])

  const activeCount = selected.size + (type !== "all" ? 1 : 0)
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

      {showFilters && (
        <FiltersPanel
          type={type}
          onType={setType}
          concepts={allConcepts}
          selected={selected}
          onToggleConcept={toggleConcept}
          onClear={clear}
        />
      )}

      {loading && <p className="text-sm text-white/40">Cargando biblioteca...</p>}
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
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ACCENTS[3]}`}>
              <ClipboardList className="h-4 w-4" />
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
