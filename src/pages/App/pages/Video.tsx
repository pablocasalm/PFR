import {
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  Captions,
  Settings,
  PictureInPicture2,
  Tv,
  Maximize,
  Info,
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

const VideoPlayer = ({ video }: { video: AnalysisDetail }) => {
  // Tramos de la barra, partidos por los capítulos.
  const bounds = [0, ...video.chapters.map((c) => (c.startSeconds / video.durationSeconds) * 100), 100]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <div className="aspect-video w-full" style={thumbStyle(hueFor(video.id))}>
        {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />}
      </div>
      <button className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:text-white">
        <Info className="h-5 w-5" />
      </button>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-4 pt-14">
        <div className="relative mb-4">
          <div className="flex items-center gap-1">
            {bounds.slice(0, -1).map((start, i) => (
              <div key={i} className="h-1 rounded-full bg-white/25" style={{ flexGrow: bounds[i + 1] - start }} />
            ))}
          </div>
          <span className="absolute top-1/2 left-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-glow" />
        </div>

        <div className="flex items-center gap-4 text-white">
          <button className="transition hover:text-neon-cyan"><Play className="h-6 w-6" fill="currentColor" /></button>
          <button className="relative transition hover:text-neon-cyan">
            <RotateCcw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">10</span>
          </button>
          <button className="relative transition hover:text-neon-cyan">
            <RotateCw className="h-5 w-5" />
            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold">10</span>
          </button>
          <button className="transition hover:text-neon-cyan"><Volume2 className="h-5 w-5" /></button>
          <span className="text-xs font-medium tabular-nums text-white/90">0:00 / {formatDuration(video.durationSeconds)}</span>
          <div className="ml-auto flex items-center gap-4">
            <button className="transition hover:text-neon-cyan"><Captions className="h-5 w-5" /></button>
            <button className="transition hover:text-neon-cyan"><Settings className="h-5 w-5" /></button>
            <button className="transition hover:text-neon-cyan"><PictureInPicture2 className="h-5 w-5" /></button>
            <button className="transition hover:text-neon-cyan"><Tv className="h-5 w-5" /></button>
            <button className="transition hover:text-neon-cyan"><Maximize className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  level: video.level,
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
                  {video.level && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="rounded-md border border-white/15 px-2 py-0.5 text-xs text-white/80">{video.level}</span>
                    </>
                  )}
                </div>
              </div>

              {video.concepts.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">Conceptos trabajados</p>
                  <div className="flex flex-wrap gap-2">
                    {video.concepts.map((c) => (
                      <span key={c} className="rounded-full border border-neon-cyan/40 px-3 py-1 text-xs font-medium text-neon-cyan">
                        #{c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
