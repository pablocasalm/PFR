import { Clock, Clapperboard, LineChart, Medal, Info, Download, Share2, Compass } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getStats } from "../../../lib/api/history"
import { renderMiJuegoStory } from "../../../lib/miJuegoStory"
import { useAuth } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { ConceptProgress } from "../components/StarterTest"

/**
 * MiJuego — Actividad real de aprendizaje (§13). Consume GET /api/history/stats.
 * Sin datos guardados/interpretaciones: solo actividad objetiva (minutos, clips/análisis
 * vistos, conceptos y bloques más trabajados).
 */

type Rank = { name: string; nameEn: string; count: number }

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

const RankRow = ({ rank, item, max }: { rank: number; item: Rank; max: number }) => {
  const { lang } = useI18n()
  return (
  <div className="flex items-center gap-3">
    <RankBadge rank={rank} />
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{pickText(item.name, item.nameEn, lang)}</span>
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
}

const RankPanel = ({ title, items }: { title: string; items: Rank[] }) => {
  const { t } = useI18n()
  const max = items[0]?.count ?? 0
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <Info className="h-4 w-4 text-white/30" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/40">{t("mi-juego.no-data", "Aún no hay datos.")}</p>
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

type StoryProps = { minutes: number; concepts: string[]; block: string; name?: string }

/** Datos de la imagen de la story con los textos ya traducidos: los usan la vista previa y el
 * botón de compartir, así que las dos salen siempre iguales. */
const useStoryData = ({ minutes, concepts, block, name }: StoryProps) => {
  const { t, lang } = useI18n()
  return {
    minutes,
    concepts,
    block,
    name,
    minutesLabel: t("mi-juego.story.minutes-label", "Min aprendiendo").toUpperCase(),
    conceptsLabel: t("mi-juego.top-concepts", "Conceptos más trabajados").toUpperCase(),
    blockLabel: t("mi-juego.top-block", "Bloque principal").toUpperCase(),
    defaultName: t("mi-juego.story.default-name", "Tu resumen"),
    locale: lang === "en" ? "en-US" : "es-ES",
  }
}

/**
 * Vista previa de la story: es la propia imagen que se descarga (1080×1920), generada aquí y
 * escalada al ancho disponible (26/10/2026). Antes era una copia en HTML que se descuadraba en
 * móviles pequeños o con nombres largos (reporte #103); así lo que se ve es exactamente lo que
 * se comparte, y en cualquier pantalla todo se reduce en proporción.
 */
const StoryCard = (props: StoryProps) => {
  const { t } = useI18n()
  const data = useStoryData(props)
  const [src, setSrc] = useState<string | null>(null)
  const key = JSON.stringify(data)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    renderMiJuegoStory(data)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#020304]">
      {src && <img src={src} alt={t("mi-juego.story-heading", "Tu resumen de aprendizaje")} className="h-full w-full object-contain" />}
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
  const { t } = useI18n()
  const storyData = useStoryData({ minutes, concepts, block, name })
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
      const blob = await renderMiJuegoStory(storyData)
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
        {busy
          ? t("mi-juego.share.generating", "Generando…")
          : canShareImage
            ? t("mi-juego.share.instagram", "Compartir en Instagram")
            : t("mi-juego.share.download", "Descargar imagen")}
      </button>
      <p className="mt-3 text-center text-xs text-white/50">
        {canShareImage
          ? t("mi-juego.share.hint-share", "Se abrirá tu app para compartir la Story.")
          : t("mi-juego.share.hint-download", "Descárgala y compártela donde quieras.")}
      </p>
    </>
  )
}

const EmptyState = () => {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neon-cyan">
        <LineChart className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-white">{t("mi-juego.empty.title", "Todavía no hay actividad suficiente")}</h2>
      <p className="mt-2 max-w-sm text-sm text-white/60">
        {t("mi-juego.empty.subtitle", "Empieza a ver clips y análisis para construir tu historial de aprendizaje.")}
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/app/inicio"
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          {t("mi-lista.empty.go-home", "Ir a Inicio")}
        </Link>
        <Link
          to="/app/explorar"
          className="flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
        >
          <Compass className="h-4 w-4" />
          {t("mi-lista.empty.go-explore", "Ir a Explorar")}
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const MiJuego = () => {
  const { t, lang } = useI18n()
  const { data: stats, loading, error } = useApi(getStats, [])
  const { user } = useAuth()
  const name = user?.displayName ?? undefined

  if (loading) return <main className="w-full py-8 text-sm text-white/40">{t("common.loading", "Cargando...")}</main>
  if (error)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">
          {t("mi-juego.load-error", "No se pudo cargar Mi Juego ({error}). ¿Has iniciado sesión?", { error })}
        </p>
      </main>
    )
  if (!stats) return null

  const hasActivity = stats.minutes > 0 || stats.clipsViewed > 0 || stats.analysesViewed > 0

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{t("header.nav.mi-juego", "Mi Juego")}</h1>
          <p className="mt-2 text-sm text-white/60">{t("mi-juego.subtitle", "Tu actividad y progreso de aprendizaje.")}</p>
        </div>
        {hasActivity && (
          <a
            href="#resumen-story"
            className="flex shrink-0 items-center gap-2 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/20"
          >
            <Share2 className="h-4 w-4" />
            {t("mi-juego.share-story", "Compartir story")}
          </a>
        )}
      </div>

      {!hasActivity ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Test inicial: cuánto llevas visto de tus conceptos para trabajar. */}
            <ConceptProgress />
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={Clock} value={stats.minutes} label={t("mi-juego.stat.minutes", "min aprendiendo")} />
              <StatCard icon={Clapperboard} value={stats.clipsViewed} label={t("mi-juego.stat.clips", "clips vistos")} />
              <StatCard icon={LineChart} value={stats.analysesViewed} label={t("mi-juego.stat.analyses", "análisis vistos")} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <RankPanel title={t("mi-juego.top-concepts", "Conceptos más trabajados")} items={stats.concepts} />
              <RankPanel title={t("mi-juego.top-blocks", "Bloques más trabajados")} items={stats.blocks} />
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
                <Info className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{t("mi-juego.explainer.title", "¿Qué significa esto?")}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  {t(
                    "mi-juego.explainer.body",
                    "\"Vistos\" cuenta todo lo que has empezado a ver (no hace falta acabarlo), y \"min aprendiendo\" suma el tiempo reproducido de todo ello. Los rankings de conceptos y bloques se calculan igual: cuanto más contenido consumas, más preciso será tu resumen.",
                  )}
                </p>
              </div>
            </div>
          </div>

          <aside id="resumen-story" className="scroll-mt-20 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-lg font-bold text-white">{t("mi-juego.story-heading", "Tu resumen de aprendizaje")}</h2>
            <p className="mt-1 text-sm text-white/50">{t("mi-juego.story-preview", "Vista previa (formato story)")}</p>
            <div className="mt-4">
              <StoryCard
                minutes={stats.minutes}
                concepts={stats.concepts.slice(0, 3).map((c) => pickText(c.name, c.nameEn, lang))}
                block={pickText(stats.blocks[0]?.name ?? "", stats.blocks[0]?.nameEn, lang)}
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
