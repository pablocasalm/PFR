import { useSearchParams, Link } from "react-router-dom"
import { SlidersHorizontal, ChevronDown, X, Bookmark, Check, ArrowRight } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSearch } from "../../../lib/api/search"
import type { ContentItem } from "../../../lib/api/types"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"

/**
 * Search — Pantalla de Resultados. Consume GET /api/search?q=.
 * Resultados reales; el panel de filtros se aplicará más adelante (visual).
 */

const FILTER_GROUPS: { title: string; options: { label: string; checked?: boolean }[] }[] = [
  {
    title: "Tipo de contenido",
    options: [{ label: "Análisis", checked: true }, { label: "Clips" }],
  },
  {
    title: "Nivel",
    options: [{ label: "Todos", checked: true }, { label: "Principiante" }, { label: "Intermedio" }, { label: "Avanzado" }],
  },
  {
    title: "Duración",
    options: [{ label: "Cualquiera", checked: true }, { label: "0 - 5 min" }, { label: "5 - 15 min" }, { label: "15 - 30 min" }, { label: "+ 30 min" }],
  },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const Thumb = ({ src, hue, className = "" }: { src?: string; hue: number; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`} style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
  </div>
)

const meta = (r: ContentItem) =>
  [r.tournament ?? (r.type === "analysis" ? "Análisis" : "Clip"), r.level].filter(Boolean).join(" • ")

const ResultCard = ({ result }: { result: ContentItem }) => (
  <Link to={watchHref(result)} className="group block">
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <Thumb src={result.thumbnailUrl} hue={hueFor(result.id)} className="aspect-video w-full" />
      <span className="absolute right-2 top-2 text-white/80"><Bookmark className="h-5 w-5" /></span>
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(result.durationSeconds)}
      </span>
    </div>
    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neon-cyan">
      {result.type === "analysis" ? "Análisis" : "Clip"}
    </p>
    <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white">{result.title}</h3>
    <p className="mt-1.5 text-xs text-white/50">{meta(result)}</p>
    {result.concepts.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {result.concepts.slice(0, 3).map((t) => (
          <span key={t} className="rounded-md border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80">#{t}</span>
        ))}
      </div>
    )}
  </Link>
)

const CheckRow = ({ label, checked }: { label: string; checked?: boolean }) => (
  <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
    <span className="flex items-center gap-2.5 text-white/80">
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-neon-cyan bg-neon-cyan" : "border-white/30"}`}>
        {checked && <Check className="h-3 w-3 text-midnight" strokeWidth={3} />}
      </span>
      {label}
    </span>
  </label>
)

const FiltersSidebar = () => (
  <aside className="h-fit space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <SlidersHorizontal className="h-4 w-4" /> Filtros
      </span>
      <button className="text-xs font-medium text-neon-cyan transition hover:brightness-110">Limpiar todo</button>
    </div>
    {FILTER_GROUPS.map((group) => (
      <div key={group.title}>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">{group.title}</p>
        <div className="space-y-0.5">
          {group.options.map((opt) => (
            <CheckRow key={opt.label} {...opt} />
          ))}
        </div>
      </div>
    ))}
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Ordenar por</p>
      <button className="flex w-full items-center justify-between rounded-lg border border-white/15 px-3 py-2.5 text-sm text-white/80 transition hover:bg-white/5">
        Más relevantes <ChevronDown className="h-4 w-4 text-white/40" />
      </button>
    </div>
    <button className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-semibold text-midnight transition hover:brightness-110">
      Aplicar filtros
    </button>
  </aside>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Search = () => {
  const [params] = useSearchParams()
  const query = params.get("q") ?? ""
  const { data, loading, error } = useApi(() => getSearch(query), [query])

  const results = data?.results ?? []
  const tabs = data?.tabs ?? []

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Resultados para <span className="text-white">“{query}”</span>
          </h1>

          {/* Tabs por tipo */}
          {tabs.length > 0 && (
            <div className="mt-6 flex items-center gap-6 border-b border-white/10">
              {tabs.map((tab, i) => (
                <button
                  key={tab.key}
                  className={`relative -mb-px flex items-center gap-2 pb-3 text-sm font-medium transition ${
                    i === 0 ? "text-neon-cyan" : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className={i === 0 ? "text-neon-cyan" : "text-white/40"}>{tab.count}</span>
                  {i === 0 && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-neon-cyan" />}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5">
                Más relevantes <ChevronDown className="h-4 w-4 text-white/40" />
              </button>
              <span className="text-sm text-white/50">{data?.total ?? 0} resultados</span>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5">
              Limpiar filtros <X className="h-4 w-4" />
            </button>
          </div>

          {loading && <p className="mt-6 text-sm text-white/40">Buscando...</p>}
          {error && <p className="mt-6 text-sm text-red-400/80">No se pudo buscar ({error}). ¿Está el backend en marcha?</p>}
          {!loading && !error && results.length === 0 && (
            <p className="mt-6 text-sm text-white/50">No hemos encontrado resultados para esta búsqueda.</p>
          )}

          {results.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
              {results.map((r) => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-4 text-sm">
            <span className="text-white/50">¿No encuentras lo que buscas?</span>
            <button className="flex items-center gap-1.5 font-medium text-neon-cyan transition hover:brightness-110">
              Sugerir un contenido <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <FiltersSidebar />
      </div>
    </main>
  )
}

export default Search
