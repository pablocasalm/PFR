import { Play, Clock, Crown, Heart, Share2, Check } from "lucide-react"
import { Navigate, useSearchParams } from "react-router-dom"
import { useRef, useState } from "react"
import { useApi } from "../../../lib/hooks/useApi"
import { getSessionDetail } from "../../../lib/api/sessions"
import { toggleLike, addComment } from "../../../lib/api/social"
import { useShare } from "../../../lib/share"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import type { SessionDetail, Chapter, Comment } from "../../../lib/api/types"
import { formatDuration, hueFor } from "../../../lib/format"
import HlsPlayer, { type VideoPlayerHandle } from "../../../lib/player/VideoPlayer"
import { saveProgress } from "../../../lib/api/history"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import ErrorScreen from "../components/ErrorScreen"

/**
 * Session — Vista de una sesión táctica mensual grabada en /app/watch?s=:id (§Club hub, Fase 2).
 * Deliberadamente más delgada que Video.tsx: sin "Sigue aprendiendo" (depende de conceptos, que
 * una sesión no tiene) ni Mi Lista todavía (§Fase n+1 — la parte de guardar es la única que
 * queda pendiente, ver conversación: toca lib/saved/store.ts, más grande de lo que parecía).
 * Like/comentarios (el resto de §Fase n+1) ya están.
 *
 * §Fase n+2 (pendiente a propósito, no construir todavía): aquí iría una sección "Clips y
 * análisis relacionados" curada por Guille, cuando se decida esa pantalla — ver el comentario
 * en Session.cs (backend) sobre SessionRelatedItem.
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

// Iniciales de quien está escribiendo (mismo criterio que el backend, ContentMapper.Initials).
const myInitials = (email: string, displayName?: string | null) => {
  const name = displayName?.trim() || email.split("@")[0]
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

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

/** "Compartir" real (§10.5): hoja de compartir nativa o copia el enlace con feedback. */
const ShareButton = () => {
  const { share, copied } = useShare()
  const { t } = useI18n()
  return (
    <button
      onClick={share}
      className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/5"
    >
      {copied ? <Check className="h-4 w-4 text-neon-cyan" /> : <Share2 className="h-4 w-4" />}
      {copied ? t("watch.link-copied", "¡Enlace copiado!") : t("watch.share", "Compartir")}
    </button>
  )
}

/** Acciones sociales: me gusta (optimista) + comentarios (POST). Sin Mi Lista todavía (§Fase n+1). */
const Social = ({ session }: { session: SessionDetail }) => {
  const { user } = useAuth()
  const { t } = useI18n()
  const [liked, setLiked] = useState(session.likedByMe)
  const [likes, setLikes] = useState(session.likes)
  const [comments, setComments] = useState<Comment[]>(session.comments)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const onLike = () => {
    const pLiked = liked
    const pLikes = likes
    setLiked(!pLiked)
    setLikes(pLikes + (pLiked ? -1 : 1))
    toggleLike("session", String(session.id))
      .then((r) => {
        setLiked(r.liked)
        setLikes(r.likes)
      })
      .catch(() => {
        setLiked(pLiked)
        setLikes(pLikes)
      })
  }

  const onSubmit = () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    addComment("session", String(session.id), body)
      .then((c) => {
        setComments((cs) => [c, ...cs])
        setText("")
      })
      .catch(() => {})
      .finally(() => setSending(false))
  }

  const commentsBody = (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar initials={user ? myInitials(user.email, user.displayName) : "?"} hue={190} className="h-9 w-9 shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={t("watch.comment-placeholder", "Escribe un comentario...")}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-neon-cyan/40 sm:text-sm"
        />
        <button
          onClick={onSubmit}
          disabled={!text.trim() || sending}
          className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
        >
          {t("watch.comment-submit", "Publicar")}
        </button>
      </div>

      {comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar initials={initialsOf(c)} hue={hueFor(c.user)} className="h-9 w-9 shrink-0" />
          <div className="flex-1">
            <p className="text-sm">
              <span className="font-semibold text-white">{c.user}</span>{" "}
              <span className="text-white/40">{c.ago}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onLike}
          aria-pressed={liked}
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
            liked ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan" : "border-white/15 text-white/80 hover:bg-white/5"
          }`}
        >
          <Heart className="h-4 w-4" fill={liked ? "currentColor" : "none"} />
          {t("watch.like", "Me gusta")}
          <span className="text-white">{likes}</span>
        </button>
        <ShareButton />
      </div>

      <div className="hidden space-y-5 border-t border-white/10 pt-6 lg:block">
        <h2 className="text-lg font-bold text-white">
          {t("watch.comments", "Comentarios")} <span className="text-white/50">({comments.length})</span>
        </h2>
        {commentsBody}
      </div>

      <button
        onClick={() => setCommentsOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/5 lg:hidden"
      >
        <span className="font-semibold text-white">
          {t("watch.comments", "Comentarios")} <span className="text-white/50">({comments.length})</span>
        </span>
        <span className="font-medium text-neon-cyan">{t("watch.see-all-comments", "Ver todos")}</span>
      </button>

      <BottomSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} title={t("watch.comments-with-count", "Comentarios ({count})", { count: comments.length })}>
        {commentsBody}
      </BottomSheet>
    </>
  )
}

const Session = () => {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const id = params.get("s") ?? ""
  // Sesiones grabadas son Club/Coach (§Stripe 3 planes) — /app/watch no está detrás de
  // RequireFeature (es compartido con Clip/Video, que sí son de todos los tiers), así que si
  // alguien entra a mano con la URL de una sesión sin el plan que toca, se corta aquí, igual
  // que RequireFeature en el resto de la app, en vez de dejar que la API devuelva 402 y se vea.
  const canWatch = hasFeature(user, "sessions")
  const { data: session, loading, error, errorStatus } = useApi(
    () => (canWatch ? getSessionDetail(id) : Promise.resolve(null)),
    [id, canWatch],
  )
  const playerRef = useRef<VideoPlayerHandle>(null)

  if (!canWatch) return <Navigate to="/app/precios" replace />

  if (loading) return <main className="w-full py-8 text-sm text-white/40">{t("watch.loading-session", "Cargando sesión...")}</main>
  if (error || !session)
    return (
      <main className="w-full py-8">
        <ErrorScreen status={errorStatus} />
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

          <Social session={session} />
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
