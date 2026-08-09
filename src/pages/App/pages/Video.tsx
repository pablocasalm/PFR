import {
  Play,
  BadgeCheck,
  Trophy,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Check,
  Clock,
  MoreVertical,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getAnalysisDetail } from "../../../lib/api/analyses"
import type { AnalysisDetail, Chapter, Comment, ContentItem } from "../../../lib/api/types"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { useSavedItems, isSaved, toggleSavedItem } from "../../../lib/saved/store"
import HlsPlayer from "../../../lib/player/VideoPlayer"
import { saveProgress } from "../../../lib/api/history"

/**
 * Video — Vista de un análisis completo en /app/watch?v=:id.
 * Datos reales vía getAnalysisDetail; el player es aún un placeholder (bloque 6).
 */

const Avatar = ({ initials, hue, className = "" }: { initials: string; hue: number; className?: string }) => (
  <span
    className={`flex items-center justify-center rounded-full text-xs font-bold text-white ${className}`}
    style={{ background: `hsl(${hue}, 35%, 30%)` }}
  >
    {initials}
  </span>
)

const initialsOf = (c: Comment) => c.initials ?? c.user.slice(0, 2).toUpperCase()

// ---------------------------------------------------------------------------
// Player (placeholder hasta el bloque 6)
// ---------------------------------------------------------------------------

const VideoPlayer = ({ video }: { video: AnalysisDetail }) => (
  <HlsPlayer
    src={video.videoUrl}
    poster={video.thumbnailUrl}
    chapters={video.chapters}
    initialPosition={video.resumeSeconds}
    onProgress={(p, d) => {
      saveProgress("analysis", video.id, p, d).catch(() => {})
    }}
  />
)

const ActionButton = ({ icon: Icon, label, count }: { icon: typeof Heart; label: string; count?: number }) => (
  <button className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5">
    <Icon className="h-4 w-4" />
    {label}
    {count !== undefined && <span className="text-white">{count}</span>}
  </button>
)

/** AnalysisDetail → ContentItem, para guardarlo en Mi Lista. */
const analysisToItem = (video: AnalysisDetail): ContentItem => ({
  id: video.id,
  type: "analysis",
  title: video.title,
  thumbnailUrl: video.thumbnailUrl,
  durationSeconds: video.durationSeconds,
  concepts: video.concepts,
  players: video.players,
  tournament: video.tournament,
})

/** Acción "Mi Lista" (§10.5): selector de estado guardar/quitar. */
const SaveAction = ({ item }: { item: ContentItem }) => {
  useSavedItems()
  const saved = isSaved(item.id)
  return (
    <button
      onClick={() => toggleSavedItem(item)}
      aria-pressed={saved}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
        saved
          ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
          : "border-white/15 text-white/80 hover:bg-white/5"
      }`}
    >
      {saved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "En Mi Lista" : "Mi Lista"}
    </button>
  )
}

const ChaptersPanel = ({ video }: { video: AnalysisDetail }) => (
  <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">Capítulos</h2>
      <span className="flex items-center gap-1.5 text-xs text-white/50">
        <Clock className="h-3.5 w-3.5" /> {formatDuration(video.durationSeconds)}
      </span>
    </div>
    <div className="space-y-1">
      {video.chapters.map((ch: Chapter, i) =>
        i === 0 ? (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-3">
            <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-neon-cyan">{formatDuration(ch.startSeconds)}</span>
            <span className="flex-1 text-sm font-semibold text-white">{ch.title}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neon-cyan text-midnight">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
            </span>
          </div>
        ) : (
          <button key={i} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5">
            <Play className="h-2.5 w-2.5 shrink-0 text-white/30" fill="currentColor" />
            <span className="w-12 shrink-0 text-xs tabular-nums text-white/50">{formatDuration(ch.startSeconds)}</span>
            <span className="flex-1 truncate text-sm text-white/90">{ch.title}</span>
            {ch.concept && (
              <span className="shrink-0 rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80">
                #{ch.concept}
              </span>
            )}
          </button>
        )
      )}
    </div>
  </section>
)

const KeepLearningPanel = ({ next }: { next?: ContentItem }) => {
  if (!next) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">Sigue aprendiendo</h2>
      <Link to={watchHref(next)} className="flex gap-3">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg" style={thumbStyle(hueFor(next.id))}>
          {next.thumbnailUrl && <img src={next.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-black/30">
              <Play className="h-4 w-4 text-white" fill="currentColor" />
            </span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-white">{next.title}</p>
          {(next.tournament || next.durationSeconds) && (
            <p className="mt-1 text-xs text-white/50">
              {next.tournament}
              {next.tournament ? " · " : ""}
              {formatDuration(next.durationSeconds)}
            </p>
          )}
          {next.concepts.length > 0 && (
            <p className="mt-2 text-xs text-white/50">
              Conceptos:{" "}
              {next.concepts.slice(0, 3).map((c) => (
                <span key={c} className="text-neon-cyan/80">#{c} </span>
              ))}
            </p>
          )}
        </div>
      </Link>
      <Link
        to={watchHref(next)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-3 text-sm font-semibold text-midnight transition hover:brightness-110"
      >
        <Play className="h-4 w-4" fill="currentColor" />
        Reproducir siguiente análisis
      </Link>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Video = () => {
  const [params] = useSearchParams()
  const id = params.get("v") ?? ""
  const { data: video, loading, error } = useApi(() => getAnalysisDetail(id), [id])

  if (loading) return <main className="w-full py-8 text-sm text-white/40">Cargando análisis...</main>
  if (error || !video)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">
          No se pudo cargar el análisis ({error ?? "no encontrado"}). ¿Está el backend en marcha?
        </p>
      </main>
    )

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Columna principal */}
        <div className="space-y-6">
          <VideoPlayer video={video} />

          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="space-y-4">
              <div>
                <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-white">
                  {video.title}
                  <BadgeCheck className="h-6 w-6 text-neon-cyan" />
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/60">
                  {video.tournament && (
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-white/40" /> {video.tournament}
                    </span>
                  )}
                  <span className="text-white/30">•</span>
                  <span>{formatDuration(video.durationSeconds)}</span>
                </div>
              </div>
              {/* Los conceptos del análisis NO se muestran (§10.4): son metadatos de búsqueda
                  (agregados de sus clips). Se ven en los clips, no aquí. */}
            </div>

            <p className="max-w-xs text-sm leading-relaxed text-white/60">{video.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton icon={Heart} label="Me gusta" count={video.likes ?? 0} />
            <ActionButton icon={MessageCircle} label="Comentarios" />
            <ActionButton icon={Share2} label="Compartir" />
            <SaveAction item={analysisToItem(video)} />
          </div>

          <section className="space-y-5 border-t border-white/10 pt-6">
            <h2 className="text-lg font-bold text-white">
              Comentarios <span className="text-white/50">({video.comments.length})</span>
            </h2>

            <div className="flex items-center gap-3">
              <Avatar initials="MP" hue={190} className="h-9 w-9 shrink-0" />
              <input
                disabled
                placeholder="Escribe un comentario..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <button className="rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white/50">Publicar</button>
            </div>

            {video.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar initials={initialsOf(c)} hue={hueFor(c.user)} className="h-9 w-9 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-white">{c.user}</span>{" "}
                    <span className="text-white/40">{c.ago}</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm text-white/50">
                  {c.likes !== undefined && (
                    <button className="flex items-center gap-1.5 transition hover:text-neon-cyan">
                      <Heart className="h-4 w-4" /> {c.likes}
                    </button>
                  )}
                  <button className="transition hover:text-white">Responder</button>
                  <button className="transition hover:text-white"><MoreVertical className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Rail derecho */}
        <aside className="space-y-6">
          {video.chapters.length > 0 && <ChaptersPanel video={video} />}
          <KeepLearningPanel next={video.related[0]} />
        </aside>
      </div>
    </main>
  )
}

export default Video
