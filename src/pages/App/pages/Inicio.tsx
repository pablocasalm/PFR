import { Play, ChevronRight, LayoutGrid, Tag, Target, Users, BarChart3, Flame } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getHome } from "../../../lib/api/home"
import type { ContentItem, PopularConcept } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"

/**
 * Inicio — Dashboard principal. Consume GET /api/home (endpoint con forma de pantalla).
 * Mezcla clips y análisis vía el modelo unificado ContentItem.
 */

const CONCEPT_ICONS: LucideIcon[] = [LayoutGrid, Tag, Target, Users, BarChart3, Flame]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// Hash estable id → tono, para el degradado de fondo cuando no hay miniatura.
const hueFor = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return 200 + (h % 60)
}

const watchHref = (item: ContentItem) =>
  item.type === "analysis" ? `/app/watch?v=${item.id}` : `/app/watch?c=${item.id}`

const Thumb = ({ src, hue, className = "" }: { src?: string; hue: number; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`} style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
  </div>
)

const TypeBadge = ({ type }: { type: ContentItem["type"] }) =>
  type === "analysis" ? (
    <span className="rounded border border-violet-400/40 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-300">
      Análisis
    </span>
  ) : (
    <span className="rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
      Clip
    </span>
  )

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

const SectionHeading = ({ title, withLink }: { title: string; withLink?: boolean }) => (
  <div className="mb-5 flex items-center justify-between">
    <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</h2>
    {withLink && (
      <button className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
        Ver todo <ChevronRight className="h-4 w-4" />
      </button>
    )}
  </div>
)

const Hero = ({ item }: { item: ContentItem | null }) => {
  const title = item?.title ?? "Bienvenido a Padel Film Room"
  const subtitle = item?.block ?? "Explora clips y análisis tácticos para mejorar tu juego."
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10">
      <Thumb src={item?.thumbnailUrl} hue={205} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-midnight via-midnight/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-midnight/60 to-transparent" />

      <div className="relative flex min-h-[360px] flex-col justify-center gap-5 p-12">
        <span className="w-fit rounded-md bg-neon-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-midnight">
          Destacado
        </span>
        <h1 className="max-w-md font-display text-6xl font-bold leading-[1.05] text-white">{title}</h1>
        <p className="max-w-sm text-sm leading-relaxed text-white/70">{subtitle}</p>
        {item && item.concepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.concepts.map((c) => (
              <span
                key={c}
                className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan"
              >
                #{c}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-5">
          <Link
            to={item ? watchHref(item) : "/app/explorar"}
            className="flex items-center gap-2 rounded-lg bg-neon-cyan px-6 py-3 text-sm font-semibold text-midnight transition hover:brightness-110"
          >
            <Play className="h-4 w-4" fill="currentColor" />
            Ver contenido
          </Link>
          {item && <SaveButton item={item} variant="pill" />}
        </div>
      </div>
    </section>
  )
}

const ContinueCard = ({ item }: { item: ContentItem }) => {
  const progress = item.progress ?? 0
  const current = Math.round((item.durationSeconds * progress) / 100)
  return (
    <Link
      to={watchHref(item)}
      className="flex overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-white/20"
    >
      <div className="relative w-56 shrink-0">
        <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="h-full min-h-[150px]" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/80 bg-black/30 backdrop-blur-sm">
            <Play className="h-5 w-5 text-white" fill="currentColor" />
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-4 p-6">
        <h3 className="text-base font-medium leading-snug text-white">{item.title}</h3>
        <div>
          <p className="mb-2 text-sm text-neon-cyan">
            {formatDuration(current)} / {formatDuration(item.durationSeconds)}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </Link>
  )
}

const ContentCard = ({ item, rank }: { item: ContentItem; rank?: number }) => (
  <Link to={watchHref(item)} className="group block w-full cursor-pointer">
    <div className="relative overflow-hidden rounded-xl border border-white/10">
      <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-full" />
      {rank != null && (
        <span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-neon-cyan text-sm font-bold text-midnight">
          {rank}
        </span>
      )}
      <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {formatDuration(item.durationSeconds)}
      </span>
      <span className="absolute bottom-2 right-2 opacity-0 transition group-hover:opacity-100">
        <SaveButton item={item} variant="icon" />
      </span>
    </div>
    <div className="mt-2.5">
      <TypeBadge type={item.type} />
    </div>
    <p className="mt-2 text-sm font-medium leading-snug text-white">{item.title}</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {item.concepts.slice(0, 3).map((c) => (
        <span key={c} className="text-[11px] text-neon-cyan/80">
          #{c}
        </span>
      ))}
    </div>
  </Link>
)

const ConceptoCard = ({ concept, icon: Icon }: { concept: PopularConcept; icon: LucideIcon }) => (
  <Link
    to={`/app/search?q=${encodeURIComponent(concept.name)}`}
    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-neon-cyan/40 hover:bg-white/[0.04]"
  >
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
      <Icon className="h-4 w-4" />
    </span>
    <span className="leading-tight">
      <span className="block text-sm font-semibold text-neon-cyan">#{concept.name}</span>
      <span className="block text-xs text-white/50">
        {concept.clipCount} {concept.clipCount === 1 ? "clip" : "clips"}
      </span>
    </span>
  </Link>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Inicio = () => {
  const { data, loading, error } = useApi(getHome, [])

  if (loading) return <main className="w-full py-8 text-sm text-white/40">Cargando...</main>
  if (error)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">
          No se pudo cargar Inicio ({error}). ¿Está el backend en marcha y expone <code>/api/home</code>?
        </p>
      </main>
    )

  const home = data
  const newThisWeek = home?.newThisWeek ?? []
  const continueWatching = home?.continueWatching ?? []
  const popularConcepts = home?.popularConcepts ?? []
  const mostViewed = home?.mostViewedThisWeek ?? []

  return (
    <main className="w-full space-y-12 py-8">
      <Hero item={home?.hero ?? null} />

      {/* Continúa viendo — solo si hay contenido iniciado y no completado */}
      {continueWatching.length > 0 && (
        <section>
          <SectionHeading title="Continúa viendo" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {continueWatching.map((item) => (
              <ContinueCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Nuevo esta semana — clips + análisis por fecha de publicación */}
      {newThisWeek.length > 0 && (
        <section>
          <SectionHeading title="Nuevo esta semana" withLink />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {newThisWeek.map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Conceptos populares */}
      {popularConcepts.length > 0 && (
        <section>
          <SectionHeading title="Conceptos populares" withLink />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {popularConcepts.map((c, i) => (
              <ConceptoCard key={c.name} concept={c} icon={CONCEPT_ICONS[i % CONCEPT_ICONS.length]} />
            ))}
          </div>
        </section>
      )}

      {/* Más vistos esta semana — ordenados por visualizaciones (7 días) */}
      {mostViewed.length > 0 && (
        <section>
          <SectionHeading title="Más vistos esta semana" withLink />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {mostViewed.map((item, i) => (
              <ContentCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

export default Inicio
