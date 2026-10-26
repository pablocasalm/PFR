import { useEffect, useMemo, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import Fuse from "fuse.js"
import { SlidersHorizontal, X, Compass } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSearch } from "../../../lib/api/search"
import { getBlocks } from "../../../lib/api/blocks"
import type { ContentItem } from "../../../lib/api/types"
import SaveButton from "../../../lib/saved/SaveButton"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import FilterPanel, { type FilterSection } from "../components/FilterPanel"
import WatchedBadge from "../components/WatchedBadge"
import EnglishBadge from "../components/EnglishBadge"
import ErrorScreen from "../components/ErrorScreen"
import { useI18n, type TFunc } from "../../../lib/i18n/store"
import { pickText, pickList } from "../../../lib/i18n/content"
import { FollowConceptButton } from "../components/StarterTest"
import { useTaxonomy, resolveTaxonomyParam } from "../../../lib/taxonomy"

/**
 * Search — Pantalla de Resultados (§11). Destino común de búsqueda, "Ver todo",
 * conceptos populares y filtros globales. Todo el estado vive en la URL, así que
 * cada origen entra con sus filtros ya aplicados y son compartibles/navegables.
 *
 * Filtrado: type/block/concept NO se mandan al backend — se piden los resultados con
 * sort/feed únicamente y todo lo demás (texto, tipo, bloque, concepto, orden por duración)
 * se filtra en cliente sobre ese conjunto completo. Si se mandaran, cada filtro activo
 * recortaría "data" y falsearía los contadores/opciones de los demás filtros (bug real:
 * ver reporte de beta sobre los contadores de pestañas).
 *
 * Búsqueda de texto (q): NO se manda al backend — un match exacto por substring dejaba
 * fuera casos tan básicos como "Globos" no encontrando "Globo" (plural/singular). En su
 * lugar se trae el catálogo completo y se rastrea con Fuse.js (fuzzy), que tolera plurales,
 * erratas y coincidencias parciales, y muestra los resultados más parecidos aunque no haya
 * un match exacto en vez de dejar la pantalla vacía.
 */

// Umbral de tolerancia de Fuse: 0 = match exacto, 1 = matchea cualquier cosa. 0.4 tolera
// plurales/erratas típicas sin degenerar en resultados sin relación con la búsqueda.
// Se busca a la vez en español y en inglés (titleEn/conceptsEn/blockEn): con la app en inglés
// los títulos se ven traducidos, y buscándolos tal cual no salía nada (§reporte de beta).
const FUSE_OPTIONS: ConstructorParameters<typeof Fuse<ContentItem>>[1] = {
  keys: [
    { name: "title", weight: 3 },
    { name: "titleEn", weight: 3 },
    { name: "concepts", weight: 2 },
    { name: "conceptsEn", weight: 2 },
    { name: "block", weight: 1.5 },
    { name: "blockEn", weight: 1.5 },
    { name: "players", weight: 1 },
    { name: "tournament", weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
}

// Taxonomía oficial de bloques (§5). Mismos campos que el panel de filtros de Explorar.
const sorts = (t: TFunc) => [
  { v: "relevance", l: t("search.sort.relevance", "Más relevantes") },
  { v: "recent", l: t("search.sort.recent", "Más recientes") },
  { v: "views", l: t("search.sort.views", "Más vistos") },
  { v: "duration", l: t("search.sort.duration", "Duración") },
]

// `watched`: "" (todos) | "unseen" (sin ver) | "seen" (vistos) — §reporte de beta.
type Filters = { q: string; block: string; concept: string; type: string; sort: string; feed: string; hasEnglish: string; watched: string }

// `concept` y `block` llegan como número (?concept=12); los nombres, ya en el idioma de la
// cuenta, los pone la página con la taxonomía (`labels`). Nunca se enseña el valor de la URL.
// `concepts`: uno o varios (?concept=22,6 → clips de cualquiera de ellos, p. ej. «Sigue
// aprendiendo» del clip, reporte #99), ya resueltos a id y con su nombre.
type Labels = { concepts: { id: number; label: string }[]; block?: string }

// Cabecera adaptada al origen desde el que llega el usuario (§11.1).
const headerTitle = (f: Filters, t: TFunc, labels: Labels): string => {
  if (f.q) return t("search.title.query", "Resultados para “{q}”", { q: f.q })
  if (f.concept) return labels.concepts.map((c) => `#${c.label}`).join(" · ")
  if (f.block) return labels.block ?? ""
  if (f.feed === "new") return t("inicio.section.new", "Nuevo esta semana")
  if (f.feed === "popular") return t("inicio.section.most-viewed", "Más vistos esta semana")
  if (f.feed === "history") return t("mi-lista.recently-watched", "Vistos recientemente")
  if (f.type === "analysis") return t("explorar.analyses-heading", "Análisis completos")
  if (f.type === "clip") return t("explorar.type.clips", "Clips")
  return t("search.title.default", "Explorar resultados")
}

// Chips de filtros aplicados (§11.3), cada uno removible.
// Cada chip sabe qué cambio de filtros lo quita (`patch`): con varios conceptos, cada uno se
// quita por separado.
type Chip = { key: string; label: string; patch: Partial<Filters> }
const appliedChips = (f: Filters, t: TFunc, labels: Labels): Chip[] => {
  const chips: Chip[] = []
  if (f.block) chips.push({ key: "block", label: labels.block ?? "", patch: { block: "" } })
  for (const c of labels.concepts)
    chips.push({
      key: `concept-${c.id}`,
      label: `#${c.label}`,
      patch: { concept: labels.concepts.filter((x) => x.id !== c.id).map((x) => x.id).join(",") },
    })
  if (f.type) chips.push({ key: "type", label: f.type === "analysis" ? t("explorar.type.analyses", "Análisis") : t("explorar.type.clips", "Clips"), patch: { type: "" } })
  if (f.hasEnglish) chips.push({ key: "hasEnglish", label: t("explorar.filter.has-english", "Con inglés"), patch: { hasEnglish: "" } })
  if (f.watched) chips.push({ key: "watched", label: f.watched === "seen" ? t("search.filter.seen", "Vistos") : t("search.filter.unseen", "Sin ver"), patch: { watched: "" } })
  return chips
}

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const Thumb = ({
  src,
  hue,
  progress,
  completed,
  hasEnglishVersion,
}: {
  src?: string
  hue: number
  progress?: number
  completed?: boolean
  hasEnglishVersion?: boolean
}) => (
  <div className="relative aspect-video w-full overflow-hidden rounded-lg" style={thumbStyle(hue)}>
    {src && <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
    {completed && <WatchedBadge />}
    {hasEnglishVersion && <EnglishBadge />}
    {progress !== undefined && progress > 0 && (
      <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
        <span className="block h-full bg-neon-cyan" style={{ width: `${Math.min(progress, 100)}%` }} />
      </span>
    )}
  </div>
)

const meta = (r: ContentItem, t: TFunc, lang: string) => {
  // Clips: la descripción propia dice más que el torneo (§reporte de beta #41).
  // Análisis: no tienen descripción a priori, se queda el torneo.
  if (r.type === "clip" && r.description) return pickText(r.description, r.descriptionEn, lang)
  return [
    r.tournament ?? (r.type === "analysis" ? t("content-card.type-analysis", "Análisis") : t("content-card.type-clip", "Clip")),
    r.players,
  ]
    .filter(Boolean)
    .join(" • ")
}

const ResultCard = ({ result }: { result: ContentItem }) => {
  const { t, lang } = useI18n()
  const concepts = pickList(result.concepts, result.conceptsEn, lang)
  return (
  <Link to={watchHref(result)} className="group block">
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <Thumb src={result.thumbnailUrl} hue={hueFor(result.id)} progress={result.progress} completed={result.completed} hasEnglishVersion={result.hasEnglishVersion} />
      <span className="absolute right-2 top-2" onClick={(e) => e.preventDefault()}>
        <SaveButton item={result} variant="icon" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {formatDuration(result.durationSeconds)}
      </span>
    </div>
    <p
      className={`mt-3 text-[11px] font-bold uppercase tracking-wider ${
        result.type === "analysis" ? "text-violet-300" : "text-neon-cyan"
      }`}
    >
      {result.type === "analysis" ? t("content-card.type-analysis", "Análisis") : t("content-card.type-clip", "Clip")}
    </p>
    <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white">{pickText(result.title, result.titleEn, lang)}</h3>
    <p className="mt-1.5 text-xs text-white/50">{meta(result, t, lang)}</p>
    {result.type === "clip" && concepts.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {concepts.slice(0, 3).map((concept) => (
          <span key={concept} className="rounded-md border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80">#{concept}</span>
        ))}
      </div>
    )}
  </Link>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Search = () => {
  const { t, lang } = useI18n()
  const SORTS = useMemo(() => sorts(t), [t])
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)

  const filters: Filters = {
    q: params.get("q") ?? "",
    block: params.get("block") ?? "",
    concept: params.get("concept") ?? "",
    type: params.get("type") ?? "",
    sort: params.get("sort") ?? "",
    feed: params.get("feed") ?? "",
    hasEnglish: params.get("hasEnglish") ?? "",
    watched: params.get("watched") ?? "",
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

  const { data: blocks } = useApi(getBlocks, [], "blocks")

  const { data, loading, error, errorStatus } = useApi(
    () => getSearch({ sort: filters.sort, feed: filters.feed }),
    [filters.sort, filters.feed],
    `search:${filters.sort}|${filters.feed}`,
  )

  // Índice fuzzy sobre el catálogo completo recibido (se reconstruye solo cuando cambian
  // los datos, no en cada tecleo — la búsqueda en sí se resuelve en memoria).
  const fuse = useMemo(() => new Fuse(data?.results ?? [], FUSE_OPTIONS), [data])

  // Con texto: ranking por similitud (tolera plurales/erratas). Sin texto: catálogo tal cual.
  const searched = useMemo(() => {
    if (!filters.q) return data?.results ?? []
    return fuse.search(filters.q).map((r) => r.item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuse, filters.q])

  // Conceptos y bloques por número (26/10/2026): la URL lleva el id; los enlaces viejos con el
  // nombre en español (?concept=Defensa) se convierten al id y se corrige la dirección.
  const tax = useTaxonomy()
  // Uno o varios conceptos (separados por comas). Los que no se reconocen se ignoran.
  const conceptIds = filters.concept
    .split(",")
    .map((part) => resolveTaxonomyParam(part.trim(), tax.conceptIdByName))
    .filter((id): id is number => id != null)
  const conceptKey = conceptIds.join(",")
  const conceptId = conceptIds.length === 1 ? conceptIds[0] : null
  const blockId = resolveTaxonomyParam(filters.block, tax.blockIdByName)
  useEffect(() => {
    const next = new URLSearchParams(params)
    let changed = false
    if (filters.concept && conceptKey && filters.concept !== conceptKey) {
      next.set("concept", conceptKey)
      changed = true
    }
    if (filters.block && blockId != null && filters.block !== String(blockId)) {
      next.set("block", String(blockId))
      changed = true
    }
    if (changed) setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptKey, blockId, filters.concept, filters.block])

  // Ids de cada contenido. Si el backend aún no los manda, salen del nombre con la taxonomía.
  const conceptIdsOf = (i: ContentItem): number[] =>
    i.conceptIds ?? (i.concepts ?? []).map((n) => tax.conceptIdByName.get(n)).filter((id): id is number => id != null)
  const blockIdsOf = (i: ContentItem): number[] =>
    [i.blockId ?? (i.block ? tax.blockIdByName.get(i.block) : undefined), ...(i.blocks ?? []).map((b) => b.blockId ?? tax.blockIdByName.get(b.block))]
      .filter((id): id is number => id != null)

  // Nombre de un concepto en el idioma de la cuenta: de la taxonomía o, si no está, del propio contenido.
  const conceptNames = useMemo(() => {
    const map = new Map<number, { es: string; en: string }>()
    searched.forEach((r) => (r.concepts ?? []).forEach((c, i) => {
      const id = r.conceptIds?.[i] ?? tax.conceptIdByName.get(c)
      if (id != null && !map.has(id)) map.set(id, { es: c, en: r.conceptsEn?.[i] ?? c })
    }))
    return map
  }, [searched, tax])
  const conceptLabel = (id: number) => {
    const c = tax.conceptById.get(id)
    const fromItems = conceptNames.get(id)
    return c ? pickText(c.nameEs, c.nameEn, lang) : fromItems ? pickText(fromItems.es, fromItems.en, lang) : ""
  }
  const blockLabel = (id: number) => {
    const b = tax.blockById.get(id)
    return b ? pickText(b.nameEs, b.nameEn, lang) : ""
  }
  const labels: Labels = {
    concepts: conceptIds.map((id) => ({ id, label: conceptLabel(id) })),
    block: blockId != null ? blockLabel(blockId) : undefined,
  }

  // Todos los conceptos disponibles para el filtro, del conjunto SIN filtrar por concepto/bloque
  // (igual que en Explorar): si se derivaran de "base" ya recortado, la lista de opciones se
  // corrompería en cuanto hubiera otro filtro activo. Sí reflejan la búsqueda de texto (q).
  const allConcepts = useMemo(() => {
    const s = new Set<number>()
    searched.forEach((r) => conceptIdsOf(r).forEach((id) => s.add(id)))
    return Array.from(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, tax])

  // Conjunto base: filtra por concepto/bloque (todo menos tipo), para poder contar las tabs.
  // Un concepto o bloque que no se reconoce (enlace roto) no muestra nada, en vez de todo.
  const base = useMemo(() => {
    let items = searched
    if (filters.concept) items = conceptIds.length === 0 ? [] : items.filter((i) => conceptIdsOf(i).some((id) => conceptIds.includes(id)))
    if (filters.block) items = blockId == null ? [] : items.filter((i) => blockIdsOf(i).includes(blockId))
    if (filters.hasEnglish) items = items.filter((i) => i.hasEnglishVersion)
    // "Visto" = mismo criterio que la insignia de las tarjetas (`completed`, lo marca el backend).
    if (filters.watched === "seen") items = items.filter((i) => i.completed)
    if (filters.watched === "unseen") items = items.filter((i) => !i.completed)
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, conceptKey, blockId, filters.concept, filters.block, filters.hasEnglish, filters.watched, tax])

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

  const chips = appliedChips(filters, t, labels)
  const activeCount = chips.length
  const empty = !loading && !error && results.length === 0

  // Secciones del panel de filtros compartido (mismo componente que Explorar).
  const filterSections: FilterSection[] = [
    {
      title: t("explorar.filter.type", "Tipo"),
      options: [
        { value: "", label: t("explorar.type.all", "Todos") },
        { value: "clip", label: t("explorar.type.clips", "Clips") },
        { value: "analysis", label: t("explorar.type.analyses", "Análisis") },
      ],
      isActive: (v) => (filters.type || "") === v,
      onToggle: (v) => setFilter({ type: v }),
    },
    {
      title: t("explorar.filter.block", "Bloque"),
      options: (blocks ?? []).filter((b) => b.id != null).map((b) => ({ value: String(b.id), label: pickText(b.nameEs, b.nameEn, lang) })),
      isActive: (v) => blockId != null && String(blockId) === v,
      onToggle: (v) => setFilter({ block: blockId != null && String(blockId) === v ? "" : v }),
    },
    {
      title: t("explorar.filter.concepts", "Conceptos"),
      options: allConcepts
        .map((id) => ({ value: String(id), label: `#${conceptLabel(id)}` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      // Varios a la vez: marcar suma, desmarcar quita (clips de cualquiera de los marcados).
      isActive: (v) => conceptIds.includes(Number(v)),
      onToggle: (v) => {
        const id = Number(v)
        const next = conceptIds.includes(id) ? conceptIds.filter((x) => x !== id) : [...conceptIds, id]
        setFilter({ concept: next.join(",") })
      },
    },
    {
      title: t("search.filter.watched", "Vistos"),
      options: [
        { value: "", label: t("explorar.type.all", "Todos") },
        { value: "unseen", label: t("search.filter.unseen", "Sin ver") },
        { value: "seen", label: t("search.filter.seen", "Vistos") },
      ],
      isActive: (v) => (filters.watched || "") === v,
      onToggle: (v) => setFilter({ watched: v }),
    },
    {
      title: t("explorar.filter.language", "Idioma"),
      options: [{ value: "1", label: t("explorar.filter.has-english", "Con inglés") }],
      isActive: (v) => filters.hasEnglish === v,
      onToggle: (v) => setFilter({ hasEnglish: filters.hasEnglish === v ? "" : v }),
    },
  ]

  const typeTabs: { key: string; label: string; count: number }[] = [
    { key: "", label: t("explorar.type.all", "Todos"), count: counts.all },
    { key: "clip", label: t("explorar.type.clips", "Clips"), count: counts.clip },
    { key: "analysis", label: t("explorar.type.analyses", "Análisis"), count: counts.analysis },
  ]

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              {headerTitle(filters, t, labels)}
            </h1>
            {/* Filtrado por un concepto: se puede seguir (va a «Conceptos para trabajar»). */}
            {conceptId != null && <FollowConceptButton conceptId={conceptId} />}
          </div>

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
                <span className="text-white/50">{t("search.sort-by", "Ordenar por")}</span>
                <select
                  value={filters.sort || "relevance"}
                  onChange={(e) => setFilter({ sort: e.target.value === "relevance" ? "" : e.target.value })}
                  className="rounded-lg border border-white/15 bg-midnight px-3 py-2 text-base text-white focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-sm text-white/50">{t("search.result-count", "{count} resultados", { count: results.length })}</span>
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition lg:hidden ${
                showFilters || activeCount > 0 ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan" : "border-white/15 text-white/80 hover:bg-white/5"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> {t("common.filters", "Filtros")}
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
                  onClick={() => setFilter(chip.patch)}
                  className="flex items-center gap-1.5 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/20"
                >
                  {chip.label} <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button onClick={clearFilters} className="px-2 text-xs font-medium text-white/50 transition hover:text-white">
                {t("search.clear-all", "Borrar todos")}
              </button>
            </div>
          )}

          {/* Filtros en móvil: hoja inferior (mismo contenido que el aside de escritorio) */}
          <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title={t("common.filters", "Filtros")}>
            <FilterPanel sections={filterSections} onClear={clearFilters} showClear={activeCount > 0} />
          </BottomSheet>

          {loading && <p className="mt-6 text-sm text-white/40">{t("search.searching", "Buscando...")}</p>}
          {error && <ErrorScreen status={errorStatus} className="mt-6 text-sm text-red-400/80" />}

          {/* Estado vacío con acciones (§11.7) */}
          {empty && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-sm text-white/70">{t("search.empty.title", "No hemos encontrado resultados para esta combinación.")}</p>
              <p className="mt-1 text-sm text-white/40">{t("search.empty.hint", "Prueba a eliminar algún filtro.")}</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {activeCount > 0 && (
                  <button onClick={clearFilters} className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-semibold text-midnight transition hover:brightness-110">
                    {t("search.empty.clear-filters", "Borrar filtros")}
                  </button>
                )}
                <Link
                  to="/app/explorar"
                  className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/5"
                >
                  <Compass className="h-4 w-4" /> {t("search.empty.back-to-explore", "Volver a Explorar")}
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
        <aside className="hidden h-fit lg:block">
          <FilterPanel sections={filterSections} onClear={clearFilters} showClear={activeCount > 0} />
        </aside>
      </div>
    </main>
  )
}

export default Search
