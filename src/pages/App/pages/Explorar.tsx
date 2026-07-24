import { SlidersHorizontal, ArrowRight, ChevronRight, Plus, MoreVertical, LayoutGrid, ArrowLeftRight, Grip, ClipboardList } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getExplore } from "../../../lib/api/explore"
import type { ContentItem, ExploreSection } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"

/**
 * Explorar — Biblioteca táctica. Consume GET /api/explore (bloques + análisis).
 */

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

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">#{children}</span>
)

const VerTodo = ({ to }: { to: string }) => (
  <Link to={to} className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
    Ver todo <ArrowRight className="h-4 w-4" />
  </Link>
)

const CarouselArrow = () => (
  <button className="absolute -right-2 top-[38%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white backdrop-blur transition hover:bg-black/90">
    <ChevronRight className="h-5 w-5" />
  </button>
)

// ---------------------------------------------------------------------------
// Tarjetas
// ---------------------------------------------------------------------------

const ClipCard = ({ clip }: { clip: ContentItem }) => (
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
        <p className="mt-1 text-xs leading-relaxed text-white/50">
          {clip.players ? <>{clip.players} </> : null}
          {clip.concepts[0] && <span className="text-neon-cyan/80">#{clip.concepts[0]}</span>}
        </p>
      </div>
      <span className="mt-0.5 shrink-0 text-white/40"><MoreVertical className="h-4 w-4" /></span>
    </div>
  </Link>
)

const ConceptSection = ({ section, index }: { section: ExploreSection; index: number }) => {
  const Icon = ICONS[index % ICONS.length]
  const accent = ACCENTS[index % ACCENTS.length]
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
      <div className="mb-5 flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="shrink-0 text-sm font-bold uppercase tracking-[0.12em] text-white">{section.block}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {section.concepts.map((c) => (
            <Chip key={c}>{c}</Chip>
          ))}
          <button className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/60 transition hover:border-neon-cyan/40 hover:text-neon-cyan">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="ml-auto">
          <VerTodo to={`/app/search?q=${encodeURIComponent(section.block)}`} />
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {section.clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
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
        {item.tournament && (item.players || item.level) ? " · " : ""}
        {item.level}
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
// Página
// ---------------------------------------------------------------------------

const Explorar = () => {
  const { data, loading, error } = useApi(getExplore, [])

  return (
    <main className="w-full space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">Explorar</h1>
          <p className="mt-2 text-sm text-white/60">
            Encuentra los mejores ejemplos de pádel organizados por conceptos clave.
          </p>
        </div>
        <button className="flex shrink-0 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/5">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {loading && <p className="text-sm text-white/40">Cargando biblioteca...</p>}
      {error && (
        <p className="text-sm text-red-400/80">No se pudo cargar Explorar ({error}). ¿Está el backend en marcha?</p>
      )}

      {data?.sections.map((section, i) => (
        <ConceptSection key={section.block} section={section} index={i} />
      ))}

      {data && data.analyses.length > 0 && (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${ACCENTS[3]}`}>
              <ClipboardList className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Análisis completos</h2>
            <div className="ml-auto">
              <VerTodo to="/app/search?q=análisis" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.analyses.map((item) => (
              <AnalisisCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default Explorar
