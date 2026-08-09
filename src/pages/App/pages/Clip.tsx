import {
  Heart,
  MessageCircle,
  Share2,
  ListPlus,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  Send,
  Check,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { useState } from "react"
import { useApi } from "../../../lib/hooks/useApi"
import { getClipDetail } from "../../../lib/api/clips"
import type { ClipDetail, Comment, ContentItem } from "../../../lib/api/types"
import { formatDuration, hueFor, thumbStyle, watchHref } from "../../../lib/format"
import { useSavedItems, isSaved, toggleSavedItem } from "../../../lib/saved/store"
import { toggleLike, addComment } from "../../../lib/api/social"
import { useShare } from "../../../lib/share"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import HlsPlayer from "../../../lib/player/VideoPlayer"
import { NextUpCard, pickNextRelated, useAutoplay } from "../../../lib/player/NextUp"
import { saveProgress } from "../../../lib/api/history"

/**
 * Clip — Vista de reproducción de un clip en /app/watch?c=:id.
 * Datos reales vía getClipDetail; el player es aún un placeholder (bloque 6).
 * Variante vertical (prueba) accesible con &layout=vertical.
 */

// ---------------------------------------------------------------------------
// Helpers visuales
// ---------------------------------------------------------------------------

const Avatar = ({ initials, hue, className = "" }: { initials: string; hue: number; className?: string }) => (
  <span
    className={`flex items-center justify-center rounded-full text-xs font-bold text-white ${className}`}
    style={{ background: `hsl(${hue}, 35%, 30%)` }}
  >
    {initials}
  </span>
)

const initialsOf = (c: Comment) => c.initials ?? c.user.slice(0, 2).toUpperCase()

const ActionButton = ({ icon: Icon, label }: { icon: typeof Heart; label: string }) => (
  <button className="flex items-center gap-2 text-sm text-white/80 transition hover:text-white">
    <Icon className="h-5 w-5" />
    {label}
  </button>
)

/**
 * Estado social del clip (§ me gusta + comentarios), compartido por ambos layouts.
 * Optimista: "Me gusta" cambia al instante y revierte si el backend falla;
 * los comentarios se antepone el que devuelve el server.
 */
type ClipSocial = ReturnType<typeof useClipSocial>

function useClipSocial(clip: ClipDetail) {
  const [liked, setLiked] = useState(clip.likedByMe ?? false)
  const [likes, setLikes] = useState(clip.likes ?? 0)
  const [comments, setComments] = useState<Comment[]>(clip.comments)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const onLike = () => {
    const pLiked = liked
    const pLikes = likes
    setLiked(!pLiked)
    setLikes(pLikes + (pLiked ? -1 : 1))
    toggleLike("clip", clip.id)
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
    addComment("clip", clip.id, body)
      .then((c) => {
        setComments((cs) => [c, ...cs])
        setText("")
      })
      .catch(() => {})
      .finally(() => setSending(false))
  }

  return { liked, likes, comments, text, setText, sending, onLike, onSubmit }
}

/** "Compartir" real (§9.4): hoja de compartir nativa o copia el enlace con feedback. */
const ShareActionRow = () => {
  const { share, copied } = useShare()
  return (
    <button
      onClick={share}
      className={`flex items-center gap-2 text-sm transition ${copied ? "text-neon-cyan" : "text-white/80 hover:text-white"}`}
    >
      {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      {copied ? "¡Copiado!" : "Compartir"}
    </button>
  )
}

/** "Compartir" real en el rail vertical (móvil). */
const ShareActionRail = () => {
  const { share, copied } = useShare()
  return (
    <button onClick={share} className="flex flex-col items-center gap-1 text-white">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition ${
          copied ? "bg-neon-cyan text-midnight" : "bg-black/40 hover:bg-black/60"
        }`}
      >
        {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      </span>
      <span className="text-[11px] font-medium">{copied ? "Copiado" : "Compartir"}</span>
    </button>
  )
}

/** "Me gusta" interactivo para la fila horizontal de acciones. */
const LikeActionRow = ({ social }: { social: ClipSocial }) => (
  <button
    onClick={social.onLike}
    aria-pressed={social.liked}
    className={`flex items-center gap-2 text-sm transition ${social.liked ? "text-neon-cyan" : "text-white/80 hover:text-white"}`}
  >
    <Heart className="h-5 w-5" fill={social.liked ? "currentColor" : "none"} />
    {social.likes}
  </button>
)

/** "Me gusta" interactivo para el rail vertical (móvil). */
const LikeActionRail = ({ social }: { social: ClipSocial }) => (
  <button onClick={social.onLike} aria-pressed={social.liked} className="flex flex-col items-center gap-1 text-white">
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition ${
        social.liked ? "bg-neon-cyan text-midnight" : "bg-black/40 hover:bg-black/60"
      }`}
    >
      <Heart className="h-5 w-5" fill={social.liked ? "currentColor" : "none"} />
    </span>
    <span className="text-[11px] font-medium">{social.likes}</span>
  </button>
)

/** ClipDetail → ContentItem, para guardarlo en Mi Lista. */
const clipToItem = (clip: ClipDetail): ContentItem => ({
  id: clip.id,
  type: "clip",
  title: clip.title,
  thumbnailUrl: clip.thumbnailUrl,
  durationSeconds: clip.durationSeconds,
  concepts: clip.concepts,
  block: clip.blocks?.[0],
})

/** Acción "Mi Lista" (§9.4) en la fila horizontal de acciones sociales. */
const SaveActionRow = ({ item }: { item: ContentItem }) => {
  useSavedItems()
  const saved = isSaved(item.id)
  return (
    <button
      onClick={() => toggleSavedItem(item)}
      aria-pressed={saved}
      className={`flex items-center gap-2 text-sm transition ${saved ? "text-neon-cyan" : "text-white/80 hover:text-white"}`}
    >
      {saved ? <Check className="h-5 w-5" /> : <ListPlus className="h-5 w-5" />}
      {saved ? "En Mi Lista" : "Mi lista"}
    </button>
  )
}

/** Acción "Mi Lista" en el rail vertical (móvil). */
const SaveActionRail = ({ item }: { item: ContentItem }) => {
  useSavedItems()
  const saved = isSaved(item.id)
  return (
    <button onClick={() => toggleSavedItem(item)} aria-pressed={saved} className="flex flex-col items-center gap-1 text-white">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur transition ${
          saved ? "bg-neon-cyan text-midnight" : "bg-black/40 hover:bg-black/60"
        }`}
      >
        {saved ? <Check className="h-5 w-5" /> : <ListPlus className="h-5 w-5" />}
      </span>
      <span className="text-[11px] font-medium">{saved ? "Guardado" : "Mi lista"}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Bloques reutilizables
// ---------------------------------------------------------------------------

// Chips clicables (§9.3 "Abrir concepto"): cada uno lleva a la Pantalla de Resultados filtrada.
const Concepts = ({ concepts }: { concepts: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {concepts.map((c) => (
      <Link
        key={c}
        to={`/app/search?concept=${encodeURIComponent(c)}`}
        className="rounded-full border border-neon-cyan/40 px-3 py-1 text-xs font-medium text-neon-cyan transition hover:bg-neon-cyan/10"
      >
        #{c}
      </Link>
    ))}
  </div>
)

const AppearsIn = ({ clip }: { clip: ClipDetail }) => {
  if (!clip.appearsIn) return null
  const a = clip.appearsIn
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg" style={thumbStyle(250)}>
        {a.thumbnailUrl ? (
          <img src={a.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/70">VS</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/50">Aparece en:</p>
        <p className="text-sm font-semibold leading-snug text-white">{a.title}</p>
        {a.event && <p className="mt-0.5 text-xs text-white/50">{a.event}</p>}
      </div>
      <Link
        to={`/app/watch?v=${a.analysisId}`}
        className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110"
      >
        Ver análisis completo <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

const CommentList = ({ social, hideHeading = false }: { social: ClipSocial; hideHeading?: boolean }) => (
  <section className="space-y-5">
    {!hideHeading && (
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Comentarios <span className="text-white/50">({social.comments.length})</span>
        </h2>
      </div>
    )}

    <div className="flex items-center gap-3">
      <Avatar initials="MP" hue={190} className="h-9 w-9 shrink-0" />
      <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 focus-within:border-neon-cyan/40">
        <input
          value={social.text}
          onChange={(e) => social.setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && social.onSubmit()}
          placeholder="Añadir un comentario..."
          className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          onClick={social.onSubmit}
          disabled={!social.text.trim() || social.sending}
          aria-label="Publicar comentario"
          className="text-neon-cyan transition hover:brightness-110 disabled:cursor-not-allowed disabled:text-white/30"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>

    <div className="space-y-5">
      {social.comments.map((c) => (
        <div key={c.id} className="flex gap-3">
          <Avatar initials={initialsOf(c)} hue={hueFor(c.user)} className="h-9 w-9 shrink-0" />
          <div className="flex flex-1 items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold text-white">{c.user}</span>{" "}
                <span className="text-white/40">{c.ago}</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{c.text}</p>
            </div>
            {c.likes !== undefined && (
              <button className="flex shrink-0 flex-col items-center gap-0.5 text-white/40 transition hover:text-neon-cyan">
                <Heart className="h-4 w-4" />
                <span className="text-xs">{c.likes}</span>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  </section>
)

/**
 * Comentarios responsive (§9.8): en escritorio se muestran en línea; en móvil se abren
 * en una hoja inferior (bottom sheet) para no interrumpir el vídeo. Al cerrarla, el
 * usuario vuelve exactamente donde estaba.
 */
const ClipComments = ({ social }: { social: ClipSocial }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="hidden lg:block">
        <CommentList social={social} />
      </div>

      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:bg-white/5 lg:hidden"
      >
        <span className="font-semibold text-white">
          Comentarios <span className="text-white/50">({social.comments.length})</span>
        </span>
        <span className="font-medium text-neon-cyan">Ver todos</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={`Comentarios (${social.comments.length})`}>
        <CommentList social={social} hideHeading />
      </BottomSheet>
    </>
  )
}

const RelatedClips = ({ related, vertical = false }: { related: ContentItem[]; vertical?: boolean }) => (
  <section className={vertical ? "mt-10 space-y-4" : "space-y-4"}>
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-white">A continuación</h2>
      <button className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan transition hover:brightness-110">
        Ver todos los clips del concepto <ArrowRight className="h-4 w-4" />
      </button>
    </div>
    <div className={`grid gap-4 ${vertical ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-4"}`}>
      {related.map((item) => (
        <Link key={item.id} to={watchHref(item)} className="group cursor-pointer">
          <div className="relative overflow-hidden rounded-xl border border-white/10">
            <div className={`${vertical ? "aspect-[9/16]" : "aspect-video"} w-full`} style={thumbStyle(hueFor(item.id))}>
              {item.thumbnailUrl && (
                <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              )}
            </div>
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {formatDuration(item.durationSeconds)}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{item.title}</p>
          {!vertical && (
            <div className="mt-1.5 flex flex-wrap gap-2">
              {item.concepts.slice(0, 2).map((t) => (
                <span key={t} className="rounded-full border border-neon-cyan/30 px-2 py-0.5 text-[11px] text-neon-cyan/80">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  </section>
)

// ---------------------------------------------------------------------------
// Players (placeholder hasta el bloque 6)
// ---------------------------------------------------------------------------

const VideoPlayer = ({ clip, endSlot }: { clip: ClipDetail; endSlot?: React.ReactNode }) => (
  <HlsPlayer
    src={clip.videoUrl}
    poster={clip.thumbnailUrl}
    initialPosition={clip.resumeSeconds}
    onProgress={(p, d) => {
      saveProgress("clip", clip.id, p, d).catch(() => {})
    }}
    endSlot={endSlot}
  />
)

const VerticalPlayer = ({ clip, social, endSlot }: { clip: ClipDetail; social: ClipSocial; endSlot?: React.ReactNode }) => (
  <div className="relative mx-auto w-full max-w-[420px]">
    <HlsPlayer
      src={clip.videoUrl}
      poster={clip.thumbnailUrl}
      aspect="9:16"
      initialPosition={clip.resumeSeconds}
      onProgress={(p, d) => {
        saveProgress("clip", clip.id, p, d).catch(() => {})
      }}
      endSlot={endSlot}
    />

    {/* Rail de acciones sociales superpuesto (estilo móvil vertical) */}
    <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
      <LikeActionRail social={social} />
      <div className="flex flex-col items-center gap-1 text-white">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="text-[11px] font-medium">{social.comments.length}</span>
      </div>
      <ShareActionRail />
      <SaveActionRail item={clipToItem(clip)} />
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

const ClipHorizontal = ({ clip }: { clip: ClipDetail }) => {
  const social = useClipSocial(clip)
  const [autoplay, setAutoplay] = useAutoplay()
  const nextClip = pickNextRelated(clip.related, clip.concepts)
  const endSlot = nextClip ? (
    <NextUpCard item={nextClip} label="Siguiente clip" autoplay={autoplay} onToggleAutoplay={setAutoplay} />
  ) : undefined
  return (
    <main className="w-full space-y-6 py-6 pb-28 md:pb-8">
      <VideoPlayer clip={clip} endSlot={endSlot} />

      {/* Móvil: pista visual de que hay más contenido relacionado hacia abajo (§9.7) */}
      {nextClip && (
        <a
          href="#clip-relacionados"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium text-neon-cyan transition hover:bg-white/5 lg:hidden"
        >
          Sigue aprendiendo <ArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      )}

      <div className="space-y-4">
        <span className="inline-block rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
          Clip
        </span>
        <h1 className="font-display text-3xl font-bold text-white">{clip.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/60">{clip.description}</p>
        <Concepts concepts={clip.concepts} />
      </div>

      <AppearsIn clip={clip} />

      <div className="flex flex-wrap items-center gap-x-10 gap-y-3 border-y border-white/10 py-4">
        <LikeActionRow social={social} />
        <ActionButton icon={MessageCircle} label={String(social.comments.length)} />
        <ShareActionRow />
        <SaveActionRow item={clipToItem(clip)} />
      </div>

      <ClipComments social={social} />
      {clip.related.length > 0 && (
        <div id="clip-relacionados">
          <RelatedClips related={clip.related} />
        </div>
      )}
    </main>
  )
}

const ClipVertical = ({ clip }: { clip: ClipDetail }) => {
  const social = useClipSocial(clip)
  const [autoplay, setAutoplay] = useAutoplay()
  const nextClip = pickNextRelated(clip.related, clip.concepts)
  const endSlot = nextClip ? (
    <NextUpCard item={nextClip} label="Siguiente clip" autoplay={autoplay} onToggleAutoplay={setAutoplay} />
  ) : undefined
  return (
    <main className="w-full py-6 pb-28 md:pb-8">
      <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
        <VerticalPlayer clip={clip} social={social} endSlot={endSlot} />
        <div className="space-y-6">
          <div className="space-y-4">
            <span className="inline-block rounded border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan">
              Clip · Vertical
            </span>
            <h1 className="font-display text-3xl font-bold text-white">{clip.title}</h1>
            <p className="text-sm leading-relaxed text-white/60">{clip.description}</p>
            <Concepts concepts={clip.concepts} />
          </div>
          <AppearsIn clip={clip} />
          <ClipComments social={social} />
        </div>
      </div>
      {clip.related.length > 0 && <RelatedClips related={clip.related} vertical />}
    </main>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const Clip = () => {
  const [params] = useSearchParams()
  const id = params.get("c") ?? ""
  const vertical = params.get("layout") === "vertical"
  const { data: clip, loading, error } = useApi(() => getClipDetail(id), [id])

  if (loading) return <main className="w-full py-8 text-sm text-white/40">Cargando clip...</main>
  if (error || !clip)
    return (
      <main className="w-full py-8">
        <p className="text-sm text-red-400/80">
          No se pudo cargar el clip ({error ?? "no encontrado"}). ¿Está el backend en marcha?
        </p>
      </main>
    )

  return vertical ? <ClipVertical clip={clip} /> : <ClipHorizontal clip={clip} />
}

export default Clip
