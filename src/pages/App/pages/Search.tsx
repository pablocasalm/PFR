import { useSearchParams, Link } from "react-router-dom"
import { SlidersHorizontal, ChevronDown, X, Bookmark, Check, ArrowRight } from "lucide-react"

/**
 * Search — Resultados de búsqueda en /app/search?q=:query. Solo visual (datos mock).
 * Contenido a la izquierda + panel de filtros a la derecha.
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

const TABS = [
  { label: "Todo", count: 128, active: true },
  { label: "Análisis", count: 82 },
  { label: "Conceptos", count: 18 },
  { label: "Bloques", count: 12 },
  { label: "Jugadores", count: 8 },
  { label: "Torneos", count: 8 },
]

type ContentType = "Análisis" | "Concepto" | "Bloque"
type Result = {
  type: ContentType
  title: string
  meta: string
  desc: string
  tags: string[]
  duration: string
  hue: number
}

const RESULTS: Result[] = [
  { type: "Análisis", title: "Coello / Tapia vs Yanguas / Nieto", meta: "Premier Padel Miami P1 • Avanzado", desc: "Cómo utilizan la salida de pared para tomar la iniciativa y presionar desde el primer golpe.", tags: ["Salida de pared", "Presión", "Transición"], duration: "18:24", hue: 205 },
  { type: "Concepto", title: "Salida de pared cruzada", meta: "Concepto • 5 min • Intermedio", desc: "Aprende cuándo y cómo usar la salida de pared cruzada para cambiar la dirección del punto.", tags: ["Salida de pared", "Dirección"], duration: "12:41", hue: 210 },
  { type: "Análisis", title: "Lebrón / Stupa vs Galán / Chingotto", meta: "Premier Padel Madrid P1 • Avanzado", desc: "Patrones de salida de pared para recuperar posición y construir el siguiente golpe.", tags: ["Salida de pared", "Recuperación", "Posición"], duration: "22:15", hue: 215 },
  { type: "Concepto", title: "Salida de pared paralela", meta: "Concepto • 4 min • Intermedio", desc: "Entiende cuándo es efectiva la salida paralela para mantener la presión.", tags: ["Salida de pared", "Presión"], duration: "08:37", hue: 220 },
  { type: "Bloque", title: "Bloque: Salidas de pared efectivas", meta: "4 análisis • 68 min • Intermedio", desc: "Selecciona de 4 análisis donde verás diferentes formas de utilizar la salida de pared para ganar ventaja.", tags: [], duration: "16:33", hue: 200 },
  { type: "Análisis", title: "Tolito Aguirre vs Gonzalo Alfonso", meta: "HEXAGON CUP • Intermedio", desc: "Ejemplo de salidas de pared rápidas para sorprender y definir el punto.", tags: ["Salida de pared", "Velocidad"], duration: "11:20", hue: 208 },
  { type: "Concepto", title: "Errores comunes en la salida de pared", meta: "Concepto • 6 min • Principiante", desc: "Evita estos errores y mejora tu efectividad desde la salida de pared.", tags: ["Salida de pared", "Errores"], duration: "07:59", hue: 212 },
  { type: "Análisis", title: "Paquito Navarro vs Martín Di Nenno", meta: "Premier Padel Paris Major • Intermedio", desc: "Análisis de cómo usan la pared para ganar tiempo y cambiar el ritmo.", tags: ["Salida de pared", "Ritmo", "Cambio"], duration: "14:22", hue: 218 },
]

const FILTER_GROUPS: { title: string; options: { label: string; count?: number; checked?: boolean }[] }[] = [
  {
    title: "Tipo de contenido",
    options: [
      { label: "Análisis", count: 82, checked: true },
      { label: "Conceptos", count: 18 },
      { label: "Bloques", count: 12 },
      { label: "Jugadores", count: 8 },
      { label: "Torneos", count: 8 },
    ],
  },
  {
    title: "Nivel",
    options: [
      { label: "Todos", checked: true },
      { label: "Principiante" },
      { label: "Intermedio" },
      { label: "Avanzado" },
    ],
  },
  {
    title: "Duración",
    options: [
      { label: "Cualquiera", checked: true },
      { label: "0 - 5 min" },
      { label: "5 - 15 min" },
      { label: "15 - 30 min" },
      { label: "+ 30 min" },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

const ResultCard = ({ result }: { result: Result }) => (
  <Link to="/app/watch?v=1" className="group block">
    <div className="relative overflow-hidden rounded-lg border border-white/10">
      <div className="aspect-video w-full" style={thumbStyle(result.hue)} />
      <span className="absolute right-2 top-2 text-white/80">
        <Bookmark className="h-5 w-5" />
      </span>
      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        {result.duration}
      </span>
    </div>
    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neon-cyan">{result.type}</p>
    <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-white">{result.title}</h3>
    <p className="mt-1.5 text-xs text-white/50">{result.meta}</p>
    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/50">{result.desc}</p>
    {result.tags.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {result.tags.map((t) => (
          <span
            key={t}
            className="rounded-md border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80"
          >
            #{t}
          </span>
        ))}
      </div>
    )}
  </Link>
)

const CheckRow = ({ label, count, checked }: { label: string; count?: number; checked?: boolean }) => (
  <label className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
    <span className="flex items-center gap-2.5 text-white/80">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border ${
          checked ? "border-neon-cyan bg-neon-cyan" : "border-white/30"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-midnight" strokeWidth={3} />}
      </span>
      {label}
    </span>
    {count !== undefined && <span className="text-white/40">{count}</span>}
  </label>
)

const FiltersSidebar = () => (
  <aside className="h-fit space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <SlidersHorizontal className="h-4 w-4" /> Filtros
      </span>
      <button className="text-xs font-medium text-neon-cyan transition hover:brightness-110">
        Limpiar todo
      </button>
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
  const query = params.get("q") ?? "salida de pared"

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Resultados */}
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Resultados para <span className="text-white">“{query}”</span>
          </h1>

          {/* Tabs por tipo */}
          <div className="mt-6 flex items-center gap-6 border-b border-white/10">
            {TABS.map((tab) => (
              <button
                key={tab.label}
                className={`relative -mb-px flex items-center gap-2 pb-3 text-sm font-medium transition ${
                  tab.active ? "text-neon-cyan" : "text-white/60 hover:text-white"
                }`}
              >
                {tab.label}
                <span className={tab.active ? "text-neon-cyan" : "text-white/40"}>{tab.count}</span>
                {tab.active && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-neon-cyan" />}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5">
                Más relevantes <ChevronDown className="h-4 w-4 text-white/40" />
              </button>
              <span className="text-sm text-white/50">128 resultados</span>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5">
              Limpiar filtros <X className="h-4 w-4" />
            </button>
          </div>

          {/* Grid de resultados */}
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
            {RESULTS.map((r) => (
              <ResultCard key={r.title} result={r} />
            ))}
          </div>

          {/* Sugerir contenido */}
          <div className="mt-10 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-4 text-sm">
            <span className="text-white/50">¿No encuentras lo que buscas?</span>
            <button className="flex items-center gap-1.5 font-medium text-neon-cyan transition hover:brightness-110">
              Sugerir un contenido <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <FiltersSidebar />
      </div>
    </main>
  )
}

export default Search
