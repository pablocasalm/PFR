import { Play, Clock, Crown } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useRef } from "react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSessionDetail } from "../../../lib/api/sessions"
import type { SessionDetail, Chapter } from "../../../lib/api/types"
import { formatDuration } from "../../../lib/format"
import HlsPlayer, { type VideoPlayerHandle } from "../../../lib/player/VideoPlayer"
import { saveProgress } from "../../../lib/api/history"
import { useAuth } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Session — Vista de una sesión táctica mensual grabada en /app/watch?s=:id (§Club hub, Fase 2).
 * Deliberadamente más delgada que Video.tsx: sin "Sigue aprendiendo" (depende de conceptos, que
 * una sesión no tiene) ni like/comentarios/Mi Lista todavía (§Fase n+1, ver conversación — es
 * mecánico añadirlo luego, ContentType/ContentId ya son genéricos en el backend).
 *
 * §Fase n+2 (pendiente a propósito, no construir todavía): aquí iría una sección "Clips y
 * análisis relacionados" curada por Guille, cuando se decida esa pantalla — ver el comentario
 * en Session.cs (backend) sobre SessionRelatedItem.
 */

const SessionPlayer = ({
  session,
  playerRef,
}: {
  session: SessionDetail
  playerRef?: React.Ref<VideoPlayerHandle>
}) => {
  const { lang } = useI18n()
  const { user } = useAuth()
  const chapters = session.chapters.map((ch) => ({ startSeconds: ch.startSeconds, title: pickText(ch.title, ch.titleEn, lang) }))
  return (
    <HlsPlayer
      ref={playerRef}
      src={session.videoUrl}
      srcEn={session.videoUrlEn ?? undefined}
      poster={session.thumbnailUrl}
      chapters={chapters}
      initialPosition={session.resumeSeconds}
      onProgress={(p, d) => {
        saveProgress("session", String(session.id), p, d).catch(() => {})
      }}
      subtitlesDefaultOn={user?.subtitlesDefaultOn}
    />
  )
}

const ChaptersPanel = ({ session, onChapterClick }: { session: SessionDetail; onChapterClick: (seconds: number) => void }) => {
  const { t, lang } = useI18n()
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{t("watch.chapters", "Capítulos")}</h2>
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          <Clock className="h-3.5 w-3.5" /> {formatDuration(session.durationSeconds)}
        </span>
      </div>
      <div className="space-y-1">
        {session.chapters.map((ch: Chapter, i) =>
          i === 0 ? (
            <button
              key={i}
              onClick={() => onChapterClick(ch.startSeconds)}
              className="flex w-full items-center gap-3 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-3 text-left transition hover:bg-neon-cyan/15"
            >
              <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-neon-cyan">{formatDuration(ch.startSeconds)}</span>
              <span className="line-clamp-2 flex-1 text-sm font-semibold text-white">{pickText(ch.title, ch.titleEn, lang)}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neon-cyan text-midnight">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
              </span>
            </button>
          ) : (
            <button
              key={i}
              onClick={() => onChapterClick(ch.startSeconds)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
            >
              <Play className="h-2.5 w-2.5 shrink-0 text-white/30" fill="currentColor" />
              <span className="w-12 shrink-0 text-xs tabular-nums text-white/50">{formatDuration(ch.startSeconds)}</span>
              <span className="line-clamp-2 flex-1 text-sm text-white/90">{pickText(ch.title, ch.titleEn, lang)}</span>
            </button>
          ),
        )}
      </div>
    </section>
  )
}

const Session = () => {
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const id = params.get("s") ?? ""
  const { data: session, loading, error } = useApi(() => getSessionDetail(id), [id])
  const playerRef = useRef<VideoPlayerHandle>(null)

  if (loading) return <main className="w-full py-8 text-sm text-white/40">{t("watch.loading-session", "Cargando sesión...")}</main>
  if (error || !session)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">
          {t("watch.session-load-error", "No se pudo cargar la sesión ({error}). ¿Está el backend en marcha?", {
            error: error ?? t("watch.not-found", "no encontrada"),
          })}
        </p>
      </main>
    )

  return (
    <main className="w-full py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <SessionPlayer session={session} playerRef={playerRef} />

          <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
            <div className="space-y-2">
              <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-white">{pickText(session.title, session.titleEn, lang)}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                <span className="flex items-center gap-1.5 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-1 text-xs font-semibold text-neon-cyan">
                  <Crown className="h-3.5 w-3.5" /> {t("session.badge", "Sesión Club")}
                </span>
                <span className="text-white/30">•</span>
                <span>{formatDuration(session.durationSeconds)}</span>
              </div>
            </div>
            {(session.description || session.descriptionEn) && (
              <p className="max-w-xs text-sm leading-relaxed text-white/60">{pickText(session.description, session.descriptionEn, lang)}</p>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {session.chapters.length > 0 && (
            <ChaptersPanel session={session} onChapterClick={(seconds) => playerRef.current?.seekTo(seconds)} />
          )}
        </aside>
      </div>
    </main>
  )
}

export default Session
