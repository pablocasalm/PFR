import { useMemo, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { SlidersHorizontal, X, Check, Compass } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSearch } from "../../../lib/api/search"
import type { ContentItem } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { BottomSheet } from "../../../lib/ui/BottomSheet"

/**
 * Search — Pantalla de Resultados (§11). Destino común de búsqueda, "Ver todo",
 * conceptos populares y filtros globales. Todo el estado vive en la URL, así que
 * cada origen entra con sus filtros ya aplicados y son compartibles/navegables.
 *
 * Filtrado: se envían los filtros al backend (contrato de `getSearch`) y además se
 * refina en cliente lo que los datos ya permiten (tipo, concepto, bloque, nivel y
 * orden por duración), para que la UI filtre de verdad aunque el backend aún no honre
 * todos los parámetros. El resto de ordenaciones (recientes/vistos) las resuelve el server.
 */

// Taxonomía oficial de bloques (§5).
const BLOCKS = [
  "Juego desde el fondo",
  "Transición defensa-ataque",
  "Juego en la red",
  "Uso del globo",
  "Gestión del ritmo",
  "Situaciones de presión",
  "Lectura del rival",
  "Uso táctico de golpes",
  "Juego en pareja",
]
const LEVELS = [
  { v: "intermedio", l: "Intermedio" },
  { v: "avanzado", l: "Avanzado" },
]
const SORTS = [
  { v: "relevance", l: "Más relevantes" },
  { v: "recent", l: "Más recientes" },
  { v: "views", l: "Más vistos" },
  { v: "duration", l: "Duración" },
]

type Filters = { q: string; block: string; concept: string; level: string; type: string; sort: string; feed: string }

// Cabecera adaptada al origen desde el que llega el usuario (§11.1).
const headerTitle = (f: Filters): string => {
  if (f.q) return `Resultados para “${f.q}”`
  if (f.concept) return `#${f.concept}`
  if (f.block) return f.block
  if (f.feed === "new") return "Nuevo esta semana"
  if (f.feed === "popular") return "Más vistos esta semana"
  if (f.feed === "history") return "Vistos recientemente"
  if (f.type === "analysis") return "Análisis completos"
  if (f.type === "clip") return "Clips"
  if (f.level) return `Nivel: ${LEVELS.find((l) => l.v === f.level)?.l ?? f.level}`
  return "Explorar resultados"
}

// Chips de filtros aplicados (§11.3), cada uno removible.
const appliedChips = (f: Filters): { key: keyof Filters; label: string }[] => {
  const chips: { key: keyof Filters; label: string }[] = []
  if (f.block) chips.push({ key: "block", label: f.block })
  if (f.concept) chips.push({ key: "concept", label: `#${f.concept}` })
  if (f.level) chips.push({ key: "level", label: `Nivel: ${LEVELS.find((l) => l.v === f.level)?.l ?? f.level}` })
  if (f.type) chips.push({ key: "type", label: f.type === "analysis" ? "Análisis" : "Clips" })
  return chips
}

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const Thumb = ({ src, hue, progress }: { src?: string; hue: number; progress?: number }) => (
  <div className="relative aspect-video w-full overflow-hidden rounded-lg" style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    {progress !== undefined && progress > 0 && (
      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <span className="block h-full bg-neon-cyan" style={{ width: `${Math.min(progress, 100)}%` }} />
      </span>
    )}
  </div>
)

const meta = (r: ContentItem) =>
  [r.tournament ?? (r.type === "analysis" ? "Análisis" : "Clip"), r.players].filter(Boolean).join(" • ")

const ResultCard = ({ result }: { result: ContentItem }) => (
  <Link to={watchHref(result)} className="group block">
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <Thumb src={result.thumbnailUrl} hue={hueFor(result.id)} progress={result.progress} />
      <span className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100" onClick={(e) => e.preventDefault()}>
        <SaveButton item={result} variant="icon" />
      </span>
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

// ---------------------------------------------------------------------------
// Controles de filtro (compartidos por el aside de escritorio y el panel móvil)
// ---------------------------------------------------------------------------

const OptionRow = ({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center justify-between py-1.5 text-left text-sm">
    <span className={`flex items-center gap-2.5 ${checked ? "text-white" : "text-white/80"}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-neon-cyan bg-neon-cyan" : "border-white/30"}`}>
        {checked && <Check className="h-3 w-3 text-midnight" strokeWidth={3} />}
      </span>
      {label}
    </span>
  </button>
)

const FilterControls = ({
  filters,
  setFilter,
  onClear,
}: {
  filters: Filters
  setFilter: (patch: Partial<Filters>) => void
  onClear: () => void
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <SlidersHorizontal className="h-4 w-4" /> Filtros
      </span>
      <button onClick={onClear} className="text-xs font-medium text-neon-cyan transition hover:brightness-110">
        Limpiar todo
      </button>
    </div>

    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Tipo de contenido</p>
      <div className="space-y-0.5">
        <OptionRow label="Todos" checked={!filters.type} onClick={() => setFilter({ type: "" })} />
        <OptionRow label="Clips" checked={filters.type === "clip"} onClick={() => setFilter({ type: "clip" })} />
        <OptionRow label="Análisis completos" checked={filters.type === "analysis"} onClick={() => setFilter({ type: "analysis" })} />
      </div>
    </div>

    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Nivel</p>
      <div className="space-y-0.5">
        <OptionRow label="Todos los niveles" checked={!filters.level} onClick={() => setFilter({ level: "" })} />
        {LEVELS.map((lv) => (
          <OptionRow key={lv.v} label={lv.l} checked={filters.level === lv.v} onClick={() => setFilter({ level: lv.v })} />
        ))}
      </div>
    </div>

    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">Bloque táctico</p>
      <div className="space-y-0.5">
        <OptionRow label="Todos los bloques" checked={!filters.block} onClick={() => setFilter({ block: "" })} />
        {BLOCKS.map((b) => (
          <OptionRow key={b} label={b} checked={filters.block === b} onClick={() => setFilter({ block: filters.block === b ? "" : b })} />
        ))}
      </div>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Search = () => {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const filters: Filters = {
    q: params.get("q") ?? "",
    block: params.get("block") ?? "",
    concept: params.get("concept") ?? "",
    level: params.get("level") ?? "",
    type: params.get("type") ?? "",
    sort: params.get("sort") ?? "",
    feed: params.get("feed") ?? "",
  }

  const setFilter = (patch: Partial<Filters>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  // Limpia filtros pero conserva la búsqueda de texto (§11.3 "Borrar todos").
  const clearFilters = () => {
    const next = new URLSearchParams()
    if (filters.q) next.set("q", filters.q)
    setParams(next)
  }

  const { data, loading, error } = useApi(
    () => getSearch(filters),
    [filters.q, filters.block, filters.concept, filters.level, filters.type, filters.sort, filters.feed],
    `search:${filters.q}|${filters.block}|${filters.concept}|${filters.level}|${filters.type}|${filters.sort}|${filters.feed}`,
  )

  // Conjunto base: filtra por concepto/bloque/nivel (todo menos tipo), para poder contar las tabs.
  const base = useMemo(() => {
    let items = data?.results ?? []
    if (filters.concept) items = items.filter((i) => (i.concepts ?? []).includes(filters.concept))
    if (filters.block) items = items.filter((i) => i.block === filters.block || (i.blocks ?? []).some((b) => b.block === filters.block))
    if (filters.level) items = items.filter((i) => !i.level || i.level === filters.level)
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filters.concept, filters.block, filters.level])

  const counts = {
    all: base.length,
    clip: base.filter((i) => i.type === "clip").length,
    analysis: base.filter((i) => i.type === "analysis").length,
  }

  // Resultados finales: aplica el tipo y ordena por duración en cliente cuando toca.
  const results = useMemo(() => {
    let items = filters.type ? base.filter((i) => i.type === filters.type) : base
    if (filters.sort === "duration") items = [...items].sort((a, b) => a.durationSeconds - b.durationSeconds)
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, filters.type, filters.sort])

  const chips = appliedChips(filters)
  const activeCount = chips.length
  const empty = !loading && !error && results.length === 0

  const typeTabs: { key: string; label: string; count: number }[] = [
    { key: "", label: "Todos", count: counts.all },
    { key: "clip", label: "Clips", count: counts.clip },
    { key: "analysis", label: "Análisis", count: counts.analysis },
  ]

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{headerTitle(filters)}</h1>

          {/* Tabs por tipo (§11) */}
          <div className="mt-6 flex items-center gap-6 border-b border-white/10">
            {typeTabs.map((tab) => {
              const active = filters.type === tab.key
              return (
                <button
                  key={tab.key || "all"}
                  onClick={() => setFilter({ type: tab.key })}
                  className={`relative -mb-px flex items-center gap-2 pb-3 text-sm font-medium transition ${
                    active ? "text-neon-cyan" : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className={active ? "text-neon-cyan" : "text-white/40"}>{tab.count}</span>
                  {active && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-neon-cyan" />}
                </button>
              )
            })}
          </div>

          {/* Toolbar: orden + recuento + filtros (móvil) */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-white/80">
                <span className="text-white/50">Ordenar por</span>
                <select
                  value={filters.sort || "relevance"}
                  onChange={(e) => setFilter({ sort: e.target.value === "relevance" ? "" : e.target.value })}
                  className="rounded-lg border border-white/15 bg-midnight px-3 py-2 text-sm text-white focus:border-neon-cyan/40 focus:outline-none"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-white/50">{results.length} resultados</span>
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition lg:hidden ${
                showFilters || activeCount > 0 ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan" : "border-white/15 text-white/80 hover:bg-white/5"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filtros
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neon-cyan px-1.5 text-[11px] font-bold text-midnight">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Chips de filtros aplicados (§11.3) */}
          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setFilter({ [chip.key]: "" } as Partial<Filters>)}
                  className="flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/20"
                >
                  {chip.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button onClick={clearFilters} className="px-2 text-xs font-medium text-white/50 transition hover:text-white">
                Borrar todos
              </button>
            </div>
          )}

          {/* Filtros en móvil: hoja inferior (mismo contenido que el aside de escritorio) */}
          <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filtros">
            <FilterControls filters={filters} setFilter={setFilter} onClear={clearFilters} />
          </BottomSheet>

          {loading && <p className="mt-6 text-sm text-white/40">Buscando...</p>}
          {error && <p className="mt-6 text-sm text-red-400/80">No se pudo buscar ({error}). ¿Está el backend en marcha?</p>}

          {/* Estado vacío con acciones (§11.7) */}
          {empty && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-white/70">No hemos encontrado resultados para esta combinación.</p>
              <p className="mt-1 text-sm text-white/40">Prueba a eliminar algún filtro.</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {activeCount > 0 && (
                  <button onClick={clearFilters} className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-semibold text-midnight transition hover:brightness-110">
                    Borrar filtros
                  </button>
                )}
                <Link
                  to="/app/explorar"
                  className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                >
                  <Compass className="h-4 w-4" /> Volver a Explorar
                </Link>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((r) => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          )}
        </div>

        {/* Aside de filtros (escritorio) */}
        <aside className="hidden h-fit rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:block">
          <FilterControls filters={filters} setFilter={setFilter} onClear={clearFilters} />
        </aside>
      </div>
    </main>
  )
}

export default Search
