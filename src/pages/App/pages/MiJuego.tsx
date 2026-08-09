import { Clock, Clapperboard, LineChart, Medal, Info, Download, Share2, Play, Compass } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getStats } from "../../../lib/api/history"
import { renderMiJuegoStory } from "../../../lib/miJuegoStory"

/**
 * MiJuego — Actividad real de aprendizaje (§13). Consume GET /api/history/stats.
 * Sin datos guardados/interpretaciones: solo actividad objetiva (minutos, clips/análisis
 * vistos, conceptos y bloques más trabajados).
 */

type Rank = { name: string; count: number }

const MEDAL_COLOR = ["text-amber-300", "text-slate-300", "text-orange-400"]

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

const StatCard = ({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
      <Icon className="h-5 w-5" />
    </span>
    <div>
      <p className="font-display text-3xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1.5 text-sm text-white/80">{label}</p>
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
        <span className="text-sm font-medium text-white">{item.name}</span>
        <span className="text-sm text-neon-cyan">
          {item.count} {item.count === 1 ? "clip" : "clips"}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }} />
      </div>
    </div>
  </div>
)

const RankPanel = ({ title, items }: { title: string; items: Rank[] }) => {
  const max = items[0]?.count ?? 0
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Info className="h-4 w-4 text-white/30" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">Aún no hay datos.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <RankRow key={item.name} rank={i + 1} item={item} max={max} />
          ))}
        </div>
      )}
    </section>
  )
}

const StoryCard = ({ minutes, concepts, block }: { minutes: number; concepts: string[]; block: string }) => {
  const month = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#0a1622] via-[#070d16] to-[#04060a] p-6">
      <div
        className="pointer-events-none absolute -right-12 top-0 h-2/3 w-3/4 opacity-50"
        style={{ background: "repeating-linear-gradient(118deg, transparent 0 13px, rgba(40,240,224,0.22) 13px 15px)" }}
      />
      <div className="pointer-events-none absolute bottom-16 left-0 h-px w-full -rotate-[8deg] bg-white/25" />
      <div
        className="pointer-events-none absolute bottom-12 right-7 h-14 w-14 rounded-full shadow-[0_0_25px_rgba(190,252,75,0.4)]"
        style={{ background: "radial-gradient(circle at 35% 30%, #ecfccb, #84cc16)" }}
      />
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
        <p className="mt-6 w-fit border-b-2 border-neon-cyan pb-1 text-sm font-bold uppercase capitalize tracking-wide text-neon-cyan">
          {month}
        </p>
        <p className="mt-4 font-display text-7xl font-bold leading-none text-white">{minutes}</p>
        <p className="text-sm font-semibold uppercase tracking-wide text-white">Min aprendiendo</p>
        {concepts.length > 0 && (
          <>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Conceptos más trabajados</p>
            <div className="mt-1 space-y-0.5">
              {concepts.map((c) => (
                <p key={c} className="font-display text-xl font-bold uppercase text-white">#{c}</p>
              ))}
            </div>
          </>
        )}
        {block && (
          <>
            <p className="mt-auto text-[11px] font-bold uppercase tracking-wide text-neon-cyan">Bloque principal</p>
            <p className="font-display text-xl font-bold uppercase leading-tight text-white">{block}</p>
          </>
        )}
      </div>
    </div>
  )
}

// Genera la imagen 9:16 y la comparte (móvil, Web Share con ficheros) o la descarga (escritorio).
const ShareSummaryButton = ({ minutes, concepts, block }: { minutes: number; concepts: string[]; block: string }) => {
  const [busy, setBusy] = useState(false)
  const canShareImage = useMemo(() => {
    try {
      return !!navigator.canShare && navigator.canShare({ files: [new File([new Blob()], "s.png", { type: "image/png" })] })
    } catch {
      return false
    }
  }, [])

  const onClick = async () => {
    setBusy(true)
    try {
      const blob = await renderMiJuegoStory({ minutes, concepts, block })
      const file = new File([blob], "mi-juego-pfr.png", { type: "image/png" })
      if (canShareImage && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "Mi Juego · Padel Film Room",
            text: "Mi resumen de aprendizaje en Padel Film Room",
          })
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return // el usuario canceló
        }
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "mi-juego-pfr.png"
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      /* generación/compartir falló: no bloqueamos la UI */
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={onClick}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-neon-cyan/50 py-3 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10 disabled:opacity-60"
      >
        {canShareImage ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {busy ? "Generando…" : canShareImage ? "Compartir en Instagram" : "Descargar imagen"}
      </button>
      <p className="mt-3 text-center text-xs text-white/50">
        {canShareImage ? "Se abrirá tu app para compartir la Story." : "Descárgala y compártela donde quieras."}
      </p>
    </>
  )
}

const EmptyState = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neon-cyan">
      <LineChart className="h-6 w-6" />
    </div>
    <h2 className="mt-5 text-xl font-bold text-white">Todavía no hay actividad suficiente</h2>
    <p className="mt-2 max-w-sm text-sm text-white/60">
      Empieza a ver clips y análisis para construir tu historial de aprendizaje.
    </p>
    <div className="mt-6 flex gap-3">
      <Link
        to="/app/inicio"
        className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
      >
        Ir a Inicio
      </Link>
      <Link
        to="/app/explorar"
        className="flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
      >
        <Compass className="h-4 w-4" />
        Ir a Explorar
      </Link>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const MiJuego = () => {
  const { data: stats, loading, error } = useApi(getStats, [])

  if (loading) return <main className="w-full py-8 text-sm text-white/40">Cargando...</main>
  if (error)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">No se pudo cargar Mi Juego ({error}). ¿Has iniciado sesión?</p>
      </main>
    )
  if (!stats) return null

  const hasActivity = stats.minutes > 0 || stats.clipsViewed > 0 || stats.analysesViewed > 0

  return (
    <main className="w-full py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Mi Juego</h1>
        <p className="mt-2 text-sm text-white/60">Tu actividad y progreso de aprendizaje.</p>
      </div>

      {!hasActivity ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Clock} value={stats.minutes} label="min aprendiendo" />
              <StatCard icon={Clapperboard} value={stats.clipsViewed} label="clips vistos" />
              <StatCard icon={LineChart} value={stats.analysesViewed} label="análisis vistos" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RankPanel title="Conceptos más trabajados" items={stats.concepts} />
              <RankPanel title="Bloques más trabajados" items={stats.blocks} />
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                <Info className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">¿Qué significa esto?</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  Estos rankings se generan con los clips y análisis que has visto de verdad. Cuanto más
                  contenido consumas, más preciso será tu resumen.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-lg font-bold text-white">Tu resumen de aprendizaje</h2>
            <p className="mt-1 text-sm text-white/50">Vista previa (formato story)</p>
            <div className="mt-4">
              <StoryCard
                minutes={stats.minutes}
                concepts={stats.concepts.slice(0, 3).map((c) => c.name)}
                block={stats.blocks[0]?.name ?? ""}
              />
            </div>
            <ShareSummaryButton
              minutes={stats.minutes}
              concepts={stats.concepts.slice(0, 3).map((c) => c.name)}
              block={stats.blocks[0]?.name ?? ""}
            />
          </aside>
        </div>
      )}
    </main>
  )
}

export default MiJuego
