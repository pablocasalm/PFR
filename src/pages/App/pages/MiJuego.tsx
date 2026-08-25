import { Clock, Clapperboard, LineChart, Medal, Info, Download, Share2, Compass, Calendar } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getStats } from "../../../lib/api/history"
import { renderMiJuegoStory } from "../../../lib/miJuegoStory"
import { useAuth } from "../../../lib/auth/store"

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

const StoryCard = ({
  minutes,
  concepts,
  block,
  name,
}: {
  minutes: number
  concepts: string[]
  block: string
  name?: string
}) => {
  const month = new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1)
  const displayName = name?.trim() || "Tu resumen"
  const topConcepts = concepts.slice(0, 3)

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border-2 border-neon-cyan bg-[#020304] p-5 shadow-[0_0_22px_rgba(40,240,224,0.55)]">
      {/* Rayas diagonales: se apagan hacia el centro (si cubrieran la tarjeta entera, el
          centro perdería contraste con los brillos del número y el marco). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          // Densidad ajustada para acercarse a la proporción 3px/40px de la imagen de Canvas
          // (en % daba un artefacto de render al combinarlo con la máscara elíptica).
          background: "repeating-linear-gradient(118deg, transparent 0 25px, rgba(40,240,224,0.25) 25px 28px)",
          maskImage: "radial-gradient(ellipse 62% 62% at center, transparent 0%, transparent 62%, black 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 62% 62% at center, transparent 0%, transparent 62%, black 100%)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col items-center px-2 pt-1 text-center">
        <img src="/Logos/logo-pfr-story.png" alt="Padel Film Room" className="h-10 w-auto" />

        {/* El nombre es ahora el titular principal (antes iba pequeño arriba a la derecha) */}
        <p className="mt-3 line-clamp-2 font-display text-4xl font-extrabold uppercase leading-tight text-white">{displayName}</p>
        <span className="mt-2 h-[3px] w-20 shrink-0 rounded-full bg-neon-cyan" />

        <p className="mt-2.5 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-neon-cyan">
          <Calendar className="h-3.5 w-3.5" />
          {monthLabel}
        </p>
        <p className="font-display text-7xl font-bold leading-none text-white">{minutes}</p>
        <p className="mt-1 text-sm font-bold uppercase tracking-wide text-white">Min aprendiendo</p>

        {topConcepts.length > 0 && (
          <div className="mt-3 w-full rounded-xl border border-neon-cyan/40 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Conceptos más trabajados</p>
            <div className="mt-1.5 divide-y divide-neon-cyan/20">
              {topConcepts.map((c) => (
                <p key={c} className="py-1.5 font-display text-base font-bold uppercase text-white">
                  {c}
                </p>
              ))}
            </div>
          </div>
        )}

        {block && (
          <div className="mt-2.5 w-full rounded-xl border border-neon-cyan/40 px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-neon-cyan">Bloque principal</p>
            <p className="mt-1 line-clamp-2 font-display text-base font-bold uppercase leading-snug text-white">{block}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Genera la imagen 9:16 y la comparte (móvil, Web Share con ficheros) o la descarga (escritorio).
const ShareSummaryButton = ({
  minutes,
  concepts,
  block,
  name,
}: {
  minutes: number
  concepts: string[]
  block: string
  name?: string
}) => {
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
      const blob = await renderMiJuegoStory({ minutes, concepts, block, name })
      const file = new File([blob], "mi-juego-pfr.png", { type: "image/png" })
      if (canShareImage && navigator.canShare?.({ files: [file] })) {
        try {
          // Solo el archivo: si además se manda `text`, algunos destinos del share sheet
          // (p. ej. "Copiar") lo añaden como un elemento de texto aparte en el portapapeles,
          // junto a la imagen (§reporte de beta).
          await navigator.share({ files: [file] })
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
  const { user } = useAuth()
  const name = user?.displayName ?? undefined

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
                  "Vistos" cuenta todo lo que has empezado a ver (no hace falta acabarlo), y "min
                  aprendiendo" suma el tiempo reproducido de todo ello. Los rankings de conceptos y
                  bloques se calculan igual: cuanto más contenido consumas, más preciso será tu resumen.
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
                name={name}
              />
            </div>
            <ShareSummaryButton
              minutes={stats.minutes}
              concepts={stats.concepts.slice(0, 3).map((c) => c.name)}
              block={stats.blocks[0]?.name ?? ""}
              name={name}
            />
          </aside>
        </div>
      )}
    </main>
  )
}

export default MiJuego
