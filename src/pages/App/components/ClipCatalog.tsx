import { useMemo, useState } from "react"
import Fuse from "fuse.js"
import { Check, Search as SearchIcon } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSearch } from "../../../lib/api/search"
import type { ContentItem } from "../../../lib/api/types"
import { formatDuration, hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"
import { Thumb } from "./ContentCard"

/**
 * Catálogo de clips seleccionable (admin) — todos los clips en rejilla, siempre a la vista, con
 * el buscador difuso de Search (Fuse.js) arriba y los bloques como fila de chips. Un clic marca
 * o desmarca el clip para la situación activa del plan (PlanEditor); el número de la tarjeta es
 * su posición dentro de esa situación. Un clip ya usado en OTRA situación lleva el número de
 * esa situación en gris, para no repetirlo sin querer. Solo clips: los análisis no entran.
 */

// Mismas claves y tolerancia que Search.tsx, para que buscar aquí se comporte igual.
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

const blocksOf = (item: ContentItem): string[] =>
  item.blocks && item.blocks.length > 0 ? item.blocks.map((b) => b.block) : item.block ? [item.block] : []

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "es"))

const chipCls = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
    active ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/65 hover:border-white/30 hover:text-white"
  }`

const ClipCatalog = ({
  selected,
  usedElsewhere,
  onToggle,
}: {
  selected: ContentItem[]
  /** id de clip → número (1..n) de la otra situación que ya lo usa. */
  usedElsewhere: Map<string, number>
  onToggle: (clip: ContentItem) => void
}) => {
  const { t } = useI18n()
  const { data, loading } = useApi(() => getSearch({ type: "clip" }), [], "admin-clip-catalog")
  const [query, setQuery] = useState("")
  const [block, setBlock] = useState("")
  const [concept, setConcept] = useState("")

  const catalog = useMemo(() => (data?.results ?? []).filter((item) => item.type === "clip"), [data])
  const fuse = useMemo(() => new Fuse(catalog, FUSE_OPTIONS), [catalog])
  const blockOptions = useMemo(() => unique(catalog.flatMap(blocksOf)), [catalog])
  // Los conceptos solo se ofrecen con un bloque elegido: sin acotar son demasiados para una fila.
  const conceptOptions = useMemo(
    () => (block ? unique(catalog.filter((item) => blocksOf(item).includes(block)).flatMap((item) => item.concepts)) : []),
    [catalog, block],
  )

  const visible = useMemo(() => {
    const q = query.trim()
    const base = q ? fuse.search(q).map((r) => r.item) : catalog
    return base.filter((item) => (!block || blocksOf(item).includes(block)) && (!concept || item.concepts.includes(concept)))
  }, [query, fuse, catalog, block, concept])

  return (
    <div className="min-w-0">
      {/* Barra flotante de búsqueda: una tarjeta translúcida con desenfoque (no un bloque de
          color sólido, que sobre el degradado del panel se veía como un parche negro). En reposo
          es una tarjeta más, como la de la situación; al hacer scroll se queda arriba y los clips
          pasan difuminados por debajo. */}
      <div className="sticky -top-4 z-10 mb-4 space-y-2.5 rounded-2xl border border-white/10 bg-midnight-soft/70 p-3 shadow-lg shadow-black/30 backdrop-blur-xl">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("clip-picker.search", "Buscar por título, concepto, bloque, jugador...")}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setBlock("")
              setConcept("")
            }}
            className={chipCls(!block)}
          >
            {t("clip-picker.all", "Todos")}
          </button>
          {blockOptions.map((b) => (
            <button
              key={b}
              onClick={() => {
                setBlock(b === block ? "" : b)
                setConcept("")
              }}
              className={chipCls(b === block)}
            >
              {b}
            </button>
          ))}
        </div>
        {conceptOptions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {conceptOptions.map((c) => (
              <button key={c} onClick={() => setConcept(c === concept ? "" : c)} className={chipCls(c === concept)}>
                #{c}
              </button>
            ))}
          </div>
        )}
      </div>
      {!loading && <p className="mb-3 text-xs text-white/40">{t("clip-picker.showing", "{count} clips", { count: visible.length })}</p>}

      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">{t("clip-picker.empty", "No hay clips que coincidan.")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const position = selected.findIndex((s) => s.id === item.id)
            const isSelected = position >= 0
            const other = usedElsewhere.get(item.id)
            return (
              <button key={item.id} onClick={() => onToggle(item)} aria-pressed={isSelected} className="group block w-full text-left">
                <div
                  className={`relative overflow-hidden rounded-xl border-2 transition ${
                    isSelected ? "border-neon-cyan shadow-[0_0_0_4px_rgba(40,240,224,0.12)]" : "border-white/10 group-hover:border-white/35"
                  }`}
                >
                  <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className={`aspect-video w-full transition ${other && !isSelected ? "opacity-40" : ""}`} />
                  <span
                    className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                      isSelected ? "bg-neon-cyan text-midnight" : "border border-white/60 bg-black/50 text-transparent group-hover:text-white/80"
                    }`}
                  >
                    {isSelected ? position + 1 : <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
                    {formatDuration(item.durationSeconds)}
                  </span>
                  {other && !isSelected && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-0.5 text-[11px] font-medium text-white/80">
                      {t("clip-picker.used", "En la situación {n}", { n: other })}
                    </span>
                  )}
                </div>
                <p className={`mt-2 line-clamp-2 text-sm font-medium leading-snug ${isSelected ? "text-neon-cyan" : "text-white"}`}>{item.title}</p>
                <p className="mt-1 line-clamp-1 text-[11px] text-white/45">{item.concepts.slice(0, 3).map((c) => `#${c}`).join(" ")}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ClipCatalog
