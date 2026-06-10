import { Clock, Clapperboard, LineChart, Medal, Info, ChevronRight, Download, Play } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * MiJuego — Actividad y progreso de aprendizaje en /app/mi-juego. Solo visual (datos mock).
 */

// ---------------------------------------------------------------------------
// Datos mock
// ---------------------------------------------------------------------------

const STATS: { icon: LucideIcon; value: string; label: string }[] = [
  { icon: Clock, value: "127", label: "min aprendiendo" },
  { icon: Clapperboard, value: "24", label: "clips vistos" },
  { icon: LineChart, value: "3", label: "análisis completos" },
]

type Rank = { label: string; count: number }
// El % de la barra es relativo al primero de la lista.
const CONCEPTOS: Rank[] = [
  { label: "#Globo", count: 12 },
  { label: "#Paciencia", count: 8 },
  { label: "#Subir", count: 7 },
  { label: "#Media pista", count: 6 },
  { label: "#Salida de pared", count: 5 },
]

const BLOQUES: Rank[] = [
  { label: "Juego desde el fondo", count: 15 },
  { label: "Transición defensa-ataque", count: 9 },
  { label: "Juego en la red", count: 6 },
  { label: "Uso del globo", count: 5 },
  { label: "Juego en pareja", count: 4 },
]

const STORY = {
  month: "Mayo 2026",
  minutes: "127",
  concepts: ["#Globo", "#Paciencia", "#Subir"],
  block: "Juego desde el fondo",
}

const MEDAL_COLOR = ["text-amber-300", "text-slate-300", "text-orange-400"]

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

const StatCard = ({ icon: Icon, value, label }: (typeof STATS)[number]) => (
  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p className="font-display text-3xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-sm text-white/80">{label}</p>
      <p className="text-xs text-white/40">Este mes</p>
    </div>
  </div>
)

const RankBadge = ({ rank }: { rank: number }) =>
  rank <= 3 ? (
    <Medal className={`h-6 w-6 shrink-0 ${MEDAL_COLOR[rank - 1]}`} />
  ) : (
    <span className="w-6 shrink-0 text-center text-sm font-semibold text-white/40">{rank}</span>
  )

const RankRow = ({ rank, item, max }: { rank: number; item: Rank; max: number }) => (
  <div className="flex items-center gap-3">
    <RankBadge rank={rank} />
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{item.label}</span>
        <span className="text-sm text-neon-cyan">{item.count} clips</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${(item.count / max) * 100}%` }} />
      </div>
    </div>
  </div>
)

const RankPanel = ({ title, items, link }: { title: string; items: Rank[]; link: string }) => {
  const max = items[0].count
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Info className="h-4 w-4 text-white/30" />
      </div>
      <div className="space-y-4">
        {items.map((item, i) => (
          <RankRow key={item.label} rank={i + 1} item={item} max={max} />
        ))}
      </div>
      <button className="mt-5 flex items-center gap-1 text-sm font-medium text-neon-cyan transition hover:brightness-110">
        {link} <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  )
}

const StoryCard = () => (
  <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0a1622] via-[#070d16] to-[#04060a] p-6">
    {/* Estelas neón */}
    <div
      className="pointer-events-none absolute -right-12 top-0 h-2/3 w-3/4 opacity-50"
      style={{
        background:
          "repeating-linear-gradient(118deg, transparent 0 13px, rgba(40,240,224,0.22) 13px 15px)",
      }}
    />
    {/* Línea de pista + pelota */}
    <div className="pointer-events-none absolute bottom-16 left-0 h-px w-full -rotate-[8deg] bg-white/25" />
    <div
      className="pointer-events-none absolute bottom-12 right-7 h-14 w-14 rounded-full shadow-[0_0_25px_rgba(190,252,75,0.4)]"
      style={{ background: "radial-gradient(circle at 35% 30%, #ecfccb, #84cc16)" }}
    />

    {/* Contenido */}
    <div className="relative z-10 flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
          <Play className="h-3.5 w-3.5" fill="currentColor" />
        </span>
        <div className="text-[10px] font-bold uppercase leading-none tracking-wide text-white">
          <p>Padel</p>
          <p>Film Room</p>
        </div>
      </div>

      <p className="mt-6 w-fit border-b-2 border-neon-cyan pb-1 text-sm font-bold uppercase tracking-wide text-neon-cyan">
        {STORY.month}
      </p>

      <p className="mt-4 font-display text-7xl font-bold leading-none text-white">{STORY.minutes}</p>
      <p className="text-sm font-semibold uppercase tracking-wide text-white">Min aprendiendo</p>

      <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Conceptos más trabajados</p>
      <div className="mt-1 space-y-0.5">
        {STORY.concepts.map((c) => (
          <p key={c} className="font-display text-xl font-bold uppercase text-white">
            {c}
          </p>
        ))}
      </div>

      <p className="mt-auto text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Bloque principal</p>
      <p className="font-display text-xl font-bold uppercase leading-tight text-white">{STORY.block}</p>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const MiJuego = () => (
  <main className="w-full py-8">
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Columna principal */}
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold text-white">Mi Juego</h1>
          <p className="mt-2 text-sm text-white/60">Tu actividad y progreso de aprendizaje.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Rankings */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RankPanel title="Conceptos más trabajados" items={CONCEPTOS} link="Ver todos los conceptos" />
          <RankPanel title="Bloques más trabajados" items={BLOQUES} link="Ver todos los bloques" />
        </div>

        {/* Explicación */}
        <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">¿Qué significa esto?</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">
              Estos rankings se generan en función de los clips que has visto y los análisis que has
              completado. Cuanto más contenido consumas, más preciso será tu resumen.
            </p>
          </div>
        </div>
      </div>

      {/* Rail derecho — resumen story */}
      <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white">Tu resumen de aprendizaje</h2>
        <p className="mt-1 text-sm text-white/50">Vista previa (formato story)</p>

        <div className="mt-4">
          <StoryCard />
        </div>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neon-cyan/50 py-3 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10">
          <Download className="h-4 w-4" />
          Descargar imagen
        </button>
        <p className="mt-3 text-center text-xs text-white/50">Descárgala y compártela donde quieras.</p>
      </aside>
    </div>
  </main>
)

export default MiJuego
