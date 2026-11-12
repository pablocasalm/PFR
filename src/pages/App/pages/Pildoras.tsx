import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Hls from "hls.js"
import { ArrowDown, ArrowLeft, RotateCcw, Bookmark, Captions, Check, CheckCircle2, ChevronDown, ChevronUp, Film, Heart, MessageCircle, Pause, Play, Share2, Volume2, VolumeX, X } from "lucide-react"
import { getClipDetail } from "../../../lib/api/clips"
import { getPillDetail } from "../../../lib/api/pills"
import { usePills } from "../../../lib/pills"
import type { Comment, ContentItem } from "../../../lib/api/types"
import { toggleLike, addComment } from "../../../lib/api/social"
import { saveProgress } from "../../../lib/api/history"
import { useSavedItems, isSaved, toggleSavedItem } from "../../../lib/saved/store"
import { useShare } from "../../../lib/share"
import { CommentList, type ClipSocial } from "./Clip"
import { useTaxonomy, blockSearchHref } from "../../../lib/taxonomy"
import type { BlockOption } from "../../../lib/api/blocks"
import { useI18n } from "../../../lib/i18n/store"
import { pickList, pickText } from "../../../lib/i18n/content"
import { useAuth } from "../../../lib/auth/store"
import { audioDefaultOf } from "../../../lib/player/videoTour"

type Audio = "es" | "en"

/**
 * PROTOTIPO de las píldoras (rama prueba-pildoras, solo en local, 07/11/2026; tarjetas #134 y
 * #136). Reproductor propio al estilo de los Shorts de YouTube en el navegador: una píldora por
 * pantalla, sin scroll de página; se pasa a la siguiente deslizando (móvil) o con las flechas y
 * el teclado (ordenador). La que está en pantalla arranca sola y se repite; las demás solo
 * enseñan su portada. De momento, clips de Inicio hacen de píldoras.
 *
 * Idioma: siempre el del audio de la cuenta (se elige al entrar la primera vez), sin selector aquí.
 * Subtítulos: botón propio en la barra de la derecha, siempre a mano; arranca según la preferencia
 * de la cuenta y vale para todas las píldoras.
 * Recorrido: las píldoras de un bloque, en orden, empezando por la pulsada; al final, una pantalla
 * para seguir con el siguiente bloque del catálogo, profundizar con los clips del bloque o volver.
 * Cada píldora se repite en bucle: no se pasa sola a la siguiente.
 * Me gusta, comentarios, Mi Lista, compartir y progreso: los mismos servicios que los clips (una
 * píldora es un clip con IsPill), así que cuentan igual en el historial y en las métricas.
 */

/** Lo que el reproductor necesita de una píldora. Mientras no haya píldoras publicadas, los clips
 * de relleno vienen de /api/clips; las píldoras, de /api/pills (tipo "pill"). */
type SlideDetail = { videoUrl: string; videoUrlEn?: string | null; likes: number; likedByMe: boolean; comments: Comment[] }
const socialType = (item: ContentItem) => (item.type === "pill" ? "pill" : "clip")
const loadDetail = (item: ContentItem): Promise<SlideDetail> =>
  item.type === "pill"
    ? getPillDetail(item.id)
    : getClipDetail(item.id).then((d) => ({ videoUrl: d.videoUrl, videoUrlEn: d.videoUrlEn, likes: d.likes ?? 0, likedByMe: d.likedByMe ?? false, comments: d.comments }))

/** Me gusta y comentarios de una píldora, con la misma forma que en los clips (para reutilizar
 * CommentList). Se rellenan al llegar el detalle; optimista, como en Clip.tsx. */
const usePillSocial = (item: ContentItem, detail: SlideDetail | null): ClipSocial => {
  const id = item.id
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  useEffect(() => {
    if (!detail) return
    setLiked(detail.likedByMe ?? false)
    setLikes(detail.likes ?? 0)
    setComments(detail.comments)
  }, [detail])

  const onLike = () => {
    const pLiked = liked
    const pLikes = likes
    setLiked(!pLiked)
    setLikes(pLikes + (pLiked ? -1 : 1))
    toggleLike(socialType(item), id)
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
    addComment(socialType(item), id, body)
      .then((c) => {
        setComments((cs) => [c, ...cs])
        setText("")
      })
      .catch(() => {})
      .finally(() => setSending(false))
  }
  return { liked, likes, comments, text, setText, sending, onLike, onSubmit }
}

type Slide = ContentItem

/** Alto libre entre la cabecera de la app y la barra de pestañas del móvil (si la hay). */
const useFreeArea = () => {
  const [area, setArea] = useState({ top: 0, bottom: 0 })
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector("header")?.getBoundingClientRect()
      const nav = document.querySelector("nav.fixed")?.getBoundingClientRect()
      const navVisible = nav && nav.height > 0 && getComputedStyle(document.querySelector("nav.fixed")!).display !== "none"
      setArea({ top: header ? header.bottom : 0, bottom: navVisible ? window.innerHeight - nav.top : 0 })
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])
  return area
}

const RailButton = ({ icon: Icon, label, onClick, active = false, disabled = false, fillWhenActive = true }: {
  icon: typeof Heart
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  fillWhenActive?: boolean
}) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className="flex flex-col items-center gap-1 text-white disabled:opacity-40" aria-label={label}>
    <span className={`flex h-12 w-12 items-center justify-center rounded-full transition ${active ? "bg-white text-midnight" : "bg-white/15 hover:bg-white/25"}`}>
      <Icon className="h-6 w-6" fill={active && fillWhenActive ? "currentColor" : "none"} />
    </span>
    <span className="text-xs font-medium">{label}</span>
  </button>
)

/** Una píldora: vídeo (solo si está en pantalla), textos encima y botones. */
const PillSlide = ({ item, active, muted, onToggleMute, audio, subtitlesOn, onToggleSubtitles, onBack }: {
  item: Slide
  onBack: () => void
  active: boolean
  muted: boolean
  onToggleMute: () => void
  audio: Audio
  subtitlesOn: boolean
  onToggleSubtitles: () => void
}) => {
  const { lang } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  // Detalle de la píldora (URL firmada del vídeo, me gusta, comentarios). Suena la versión del
  // idioma de la cuenta (la original si no hay doblaje).
  const [detail, setDetail] = useState<SlideDetail | null>(null)
  const src = detail ? (audio === "en" && detail.videoUrlEn ? detail.videoUrlEn : detail.videoUrl) : null
  const social = usePillSocial(item, detail)
  useSavedItems()
  const saved = isSaved(item.id)
  const { share, copied } = useShare(pickText(item.title, item.titleEn, "es"))
  const [commentsOpen, setCommentsOpen] = useState(false)
  // Progreso para el historial y las métricas: cada 5 s de vídeo (las píldoras duran poco; los
  // clips lo hacen cada 10), al pausar y al salir.
  const lastReport = useRef(0)
  const report = useCallback(() => {
    const video = videoRef.current
    if (video?.duration && video.currentTime > 0) saveProgress(socialType(item), item.id, Math.floor(video.currentTime), Math.floor(video.duration)).catch(() => {})
  }, [item])
  const [hasSubtitles, setHasSubtitles] = useState(false)
  const [cueLines, setCueLines] = useState<string[]>([])
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)

  // El detalle se pide solo al llegar a esta píldora.
  useEffect(() => {
    if (!active || detail) return
    loadDetail(item).then(setDetail).catch(() => {})
  }, [active, detail, item])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src || !active) return
    let hls: Hls | null = null
    setHasSubtitles(false)
    setCueLines([])
    if (Hls.isSupported()) {
      hls = new Hls({ capLevelToPlayerSize: true })
      // hls.js conoce las pistas de subtítulos en este evento, no al leer el manifiesto.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => setHasSubtitles(hls!.subtitleTracks.length > 0))
      hls.loadSource(src)
      hls.attachMedia(video)
      hlsRef.current = hls
    } else {
      video.src = src
    }
    video.currentTime = 0
    lastReport.current = 0
    video.play().catch(() => {
      // Sin un toque previo el navegador no deja arrancar con sonido: se arranca en silencio.
      video.muted = true
      video.play().catch(() => {})
    })
    return () => {
      report() // al salir de esta píldora (deslizar, volver)
      hls?.destroy()
      hlsRef.current = null
      video.pause()
      video.removeAttribute("src")
      video.load()
    }
  }, [src, active, report])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  // Subtítulos encendidos o apagados (una pista por vídeo). La pista va en "hidden": el navegador
  // carga las frases y avisa, y se pintan aquí, encima del vídeo, como en el resto de la app.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !hasSubtitles) return
    const hls = hlsRef.current
    if (hls) {
      hls.subtitleTrack = subtitlesOn ? 0 : -1
      hls.subtitleDisplay = false
    } else {
      for (const tr of Array.from(video.textTracks)) if (tr.kind === "subtitles" || tr.kind === "captions") tr.mode = subtitlesOn ? "hidden" : "disabled"
    }
    if (!subtitlesOn) setCueLines([])
  }, [subtitlesOn, hasSubtitles])

  // Frases activas de la pista de subtítulos (hls.js o el HLS de Safari).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src || !active) return
    const tracks = video.textTracks
    const isSubtitle = (tr: TextTrack) => tr.kind === "subtitles" || tr.kind === "captions"
    const sync = () => {
      const lines: string[] = []
      for (const tr of Array.from(tracks)) {
        if (!isSubtitle(tr) || tr.mode === "disabled") continue
        for (const cue of Array.from(tr.activeCues ?? [])) lines.push((cue as VTTCue).text.replace(/<[^>]+>/g, "").replace(/\n/g, " "))
      }
      setCueLines((prev) => (prev.join("|") === lines.join("|") ? prev : lines))
    }
    const watch = () => {
      for (const tr of Array.from(tracks)) {
        tr.removeEventListener("cuechange", sync)
        tr.addEventListener("cuechange", sync)
        // HLS de Safari: nadie más avisa de que hay subtítulos.
        if (!hlsRef.current && isSubtitle(tr)) setHasSubtitles(true)
      }
    }
    tracks.addEventListener("addtrack", watch)
    tracks.addEventListener("change", sync)
    watch()
    return () => {
      tracks.removeEventListener("addtrack", watch)
      tracks.removeEventListener("change", sync)
      for (const tr of Array.from(tracks)) tr.removeEventListener("cuechange", sync)
      setCueLines([]) // al salir de esta píldora no se queda su última frase
    }
  }, [src, active])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video?.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    video.currentTime = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1) * video.duration
  }

  const concepts = pickList(item.concepts, item.conceptsEn, lang).slice(0, 3)

  // Los mismos botones a la derecha del vídeo (móvil, encima; ordenador, al lado).
  const rail = (
    <>
      <RailButton icon={Heart} label={social.likes > 0 ? String(social.likes) : "Me gusta"} active={social.liked} onClick={social.onLike} />
      <RailButton icon={MessageCircle} label={String(social.comments.length)} onClick={() => setCommentsOpen(true)} />
      <RailButton icon={copied ? Check : Share2} label={copied ? "Copiado" : "Compartir"} active={copied} fillWhenActive={false} onClick={share} />
      <RailButton icon={Bookmark} label={saved ? "Guardado" : "Mi Lista"} active={saved} onClick={() => toggleSavedItem(item)} />
      <RailButton icon={Captions} label="Subtítulos" active={subtitlesOn} disabled={!hasSubtitles} fillWhenActive={false} onClick={onToggleSubtitles} />
    </>
  )

  return (
    <div className="flex h-full w-full snap-start snap-always items-center justify-center gap-4 sm:py-4">
      {/* Vídeo 9:16 que cabe entero: en el móvil ocupa todo el hueco; en el ordenador, centrado. */}
      <div className="relative h-full w-full overflow-hidden bg-black sm:w-[calc(var(--pill-h)*9/16)] sm:max-w-full sm:rounded-2xl">
        {active && src ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain"
            poster={item.thumbnailUrl}
            playsInline
            loop
            muted={muted}
            onClick={togglePlay}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false)
              report()
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              setProgress(v.duration ? v.currentTime / v.duration : 0)
              if (Math.abs(v.currentTime - lastReport.current) >= 5) {
                lastReport.current = v.currentTime
                report()
              }
            }}
          />
        ) : (
          <img src={item.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}

        {/* Arriba: volver a la izquierda (no se sabe desde qué pantalla se llega); pausa y
            sonido a la derecha, como en Shorts. */}
        <div className="absolute inset-x-0 top-0 z-[2] flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15" aria-label="Volver">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={togglePlay} className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15" aria-label={playing ? "Pausar" : "Reproducir"}>
              {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
            </button>
            <button type="button" onClick={onToggleMute} className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15" aria-label={muted ? "Activar sonido" : "Silenciar"}>
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Pausa grande en el centro mientras está parado. */}
        {active && src && !playing && (
          <button type="button" onClick={togglePlay} className="absolute inset-0 flex items-center justify-center" aria-label="Reproducir">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
              <Play className="ml-1 h-8 w-8" fill="currentColor" />
            </span>
          </button>
        )}

        {/* Subtítulos, por encima del título. */}
        {active && subtitlesOn && cueLines.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-32 z-[1] flex justify-center px-4 pr-20 sm:pr-4">
            <p className="rounded-md bg-black/75 px-2.5 py-1 text-center text-sm font-medium leading-snug text-white [text-wrap:balance]">{cueLines.join(" ")}</p>
          </div>
        )}

        {/* Abajo: textos encima del vídeo y la barra de progreso. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-5 pt-16 pr-20 sm:pr-4">
          <span className="rounded border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">Píldora</span>
          <p className="mt-2 text-base font-bold leading-snug text-white">{pickText(item.title, item.titleEn, lang)}</p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`pointer-events-auto mt-1 block text-left text-sm text-white/80 ${expanded ? "" : "line-clamp-2"}`}
          >
            {concepts.map((c) => `#${c}`).join("  ")}
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-3 cursor-pointer touch-none" onPointerDown={seek} role="slider" aria-label="Progreso" aria-valuenow={Math.round(progress * 100)}>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <div className="h-full bg-neon-cyan" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        {/* Móvil: botones encima del vídeo, a la derecha. */}
        <div className="absolute bottom-16 right-2 flex flex-col gap-4 sm:hidden">
          {rail}
        </div>

        {/* Comentarios: hoja desde abajo dentro del vídeo, como en Shorts (móvil y ordenador). */}
        {commentsOpen && (
          <div className="absolute inset-0 z-10 flex items-end bg-black/50" onClick={() => setCommentsOpen(false)}>
            <div className="flex max-h-[75%] w-full flex-col rounded-t-2xl bg-midnight" onClick={(e) => e.stopPropagation()}>
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
                <p className="text-sm font-bold text-white">Comentarios ({social.comments.length})</p>
                <button type="button" onClick={() => setCommentsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <CommentList social={social} hideHeading />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Ordenador: botones al lado del vídeo, como en YouTube. */}
      <div className="hidden flex-col justify-end gap-5 self-end pb-6 sm:flex">{rail}</div>
    </div>
  )
}

/** Pantalla al terminar las píldoras de un bloque, con el formato de una píldora más (como los
 * anuncios dentro de los Shorts): mismo marco y flecha de volver; de fondo, la portada de la
 * siguiente píldora, difuminada y en movimiento lento; abajo, el texto y el botón de acción.
 * Sin número de vistas: se puede llegar aquí sin haberlas visto todas (entrando por la 3.ª o
 * deslizando rápido). En el último bloque con píldoras, el final de todo: si faltan por ver, a la
 * primera que falta; si se han visto todas, volver a empezar. */
const BlockEnd = ({ block, nextBlock, allSeen, background, active, onNext, onDeepen, onBack, onMissing, onRestart }: {
  block: BlockOption | undefined
  nextBlock: BlockOption | undefined
  allSeen: boolean
  onMissing: () => void
  onRestart: () => void
  background?: string
  active: boolean
  onNext: () => void
  onDeepen: () => void
  onBack: () => void
}) => {
  const { lang } = useI18n()
  const name = (b: BlockOption | undefined) => (b ? (lang === "en" ? b.nameEn || b.nameEs : b.nameEs) : "")
  // Entra con una animación corta cada vez que se llega a ella (se vuelve a montar con `key`).
  const anim = (delay: number) => (active ? { animation: `pill-end-in .45s ease-out ${delay}ms both` } : { opacity: 0 })
  return (
    <div className="flex h-full w-full snap-start snap-always items-center justify-center gap-4 sm:py-4">
      <div className="relative h-full w-full overflow-hidden bg-black sm:w-[calc(var(--pill-h)*9/16)] sm:max-w-full sm:rounded-2xl">
        {/* «Vídeo» de fondo: la portada siguiente, difuminada, con un zoom lento. */}
        {background ? (
          <img src={background} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-md motion-safe:animate-[pill-end-bg_14s_ease-in-out_infinite_alternate]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 via-midnight to-midnight" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />

        {/* Arriba: la misma flecha de volver que en las píldoras. */}
        <div className="absolute inset-x-0 top-0 z-[2] flex items-center p-3">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/15" aria-label="Volver">
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>

        {/* Centro: lo que se ha hecho. */}
        <div className="absolute inset-x-0 top-[22%] flex flex-col items-center gap-3 px-6 text-center" style={anim(0)}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-cyan/20 text-neon-cyan backdrop-blur">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="text-lg font-bold text-white">{nextBlock ? "Has llegado al final de" : allSeen ? "¡Has visto todas las píldoras!" : "Has llegado al final de las píldoras"}</p>
          <p className="text-sm text-white/70">{nextBlock ? name(block) : "Pronto habrá más"}</p>
        </div>

        {/* Abajo, como un anuncio: etiqueta, texto y botón de acción a todo el ancho. */}
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 pb-6">
          <div style={anim(150)}>
            <span className="rounded border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
              {nextBlock ? "Fin del bloque" : "Fin de las píldoras"}
            </span>
            <p className="mt-2 text-base font-bold leading-snug text-white">
              {nextBlock ? `¿Seguimos con ${name(nextBlock)}?` : allSeen ? "Sigue practicando con partidos reales" : "Te quedan píldoras por ver"}
            </p>
            <p className="mt-1 text-sm text-white/75">
              {nextBlock
                ? "O profundiza en lo que acabas de ver con los clips de partido."
                : allSeen
                  ? `Mientras llegan las nuevas, mira cómo se aplica en los clips de ${name(block)}.`
                  : "Te llevamos a la primera que no has visto, o profundiza con los clips de partido."}
            </p>
          </div>
          {nextBlock && (
            <button type="button" onClick={onNext} style={anim(260)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110">
              Siguiente bloque <ArrowDown className="h-4 w-4" />
            </button>
          )}
          {!nextBlock && !allSeen && (
            <button type="button" onClick={onMissing} style={anim(260)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110">
              Ver las que te faltan <ArrowDown className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onDeepen}
            style={anim(nextBlock || !allSeen ? 340 : 260)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition ${
              nextBlock || !allSeen ? "bg-white/15 text-white hover:bg-white/25" : "bg-neon-cyan text-midnight hover:brightness-110"
            }`}
          >
            <Film className="h-4 w-4" /> Ver clips de {name(block)}
          </button>
          {!nextBlock && allSeen && (
            <button type="button" onClick={onRestart} style={anim(340)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/15 py-3 text-sm font-bold text-white transition hover:bg-white/25">
              <RotateCcw className="h-4 w-4" /> Volver a empezar
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes pill-end-in { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        @keyframes pill-end-bg { from { transform: scale(1.1) } to { transform: scale(1.25) } }
        @media (prefers-reduced-motion: reduce) { @keyframes pill-end-in { from { opacity: 1 } to { opacity: 1 } } }`}</style>
    </div>
  )
}

const Pildoras = () => {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // La de entrada se lee una vez; luego la dirección va siguiendo a la que está en pantalla.
  const [startId] = useState(() => params.get("p"))
  const { items: allPills } = usePills()
  const tax = useTaxonomy()
  const blockIdOf = (p: ContentItem) => p.blockId ?? (p.block ? tax.blockIdByName.get(p.block) : undefined)
  // El bloque que se recorre: el de la píldora pulsada (o el de la primera, si se entra sin ninguna).
  // Con ?b= (botón «Píldoras» de un bloque en Explorar), ese bloque desde su primera píldora.
  const [blockId, setBlockId] = useState<number | undefined>(() => {
    const b = Number(params.get("b"))
    return Number.isInteger(b) && b > 0 ? b : undefined
  })
  const startPill = allPills.find((p) => p.id === startId) ?? allPills[0]
  const currentBlockId = blockId ?? (startPill ? blockIdOf(startPill) : undefined)
  const slides = allPills.filter((p) => blockIdOf(p) === currentBlockId)
  const currentBlock = currentBlockId != null ? tax.blockById.get(currentBlockId) : undefined
  // Siguiente bloque del catálogo que tenga píldoras.
  const blocksInOrder = tax.blocks.map((b) => b.id)
  const nextBlockId = blocksInOrder.slice(blocksInOrder.indexOf(currentBlockId ?? -1) + 1).find((id) => allPills.some((p) => blockIdOf(p) === id))
  const nextBlock = nextBlockId != null ? tax.blockById.get(nextBlockId) : undefined
  const area = useFreeArea()
  const feedRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const { user } = useAuth()
  const audio: Audio = audioDefaultOf(user?.videoAudioLanguage)
  const [subtitlesOn, setSubtitlesOn] = useState(!!user?.subtitlesDefaultOn)

  // La píldora pulsada es la primera que se ve (por encima quedan las anteriores del bloque).
  useEffect(() => {
    if (!startId || slides.length === 0 || !feedRef.current || blockId != null) return
    const index = Math.max(0, slides.findIndex((s) => s.id === startId))
    feedRef.current.scrollTo({ top: index * feedRef.current.clientHeight })
    setActiveIndex(index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, startId])

  // Cambiar de bloque y colocarse en una de sus píldoras (por defecto, la primera).
  const [pendingPill, setPendingPill] = useState<string | null>(null)
  const goToBlock = (id: number, pillId?: string) => {
    setBlockId(id)
    setPendingPill(pillId ?? null)
    setActiveIndex(0)
    feedRef.current?.scrollTo({ top: 0 })
  }
  const goToNextBlock = () => nextBlockId != null && goToBlock(nextBlockId)
  useEffect(() => {
    if (!pendingPill || !feedRef.current) return
    const index = slides.findIndex((s) => s.id === pendingPill)
    if (index < 0) return
    feedRef.current.scrollTo({ top: index * feedRef.current.clientHeight })
    setActiveIndex(index)
    setPendingPill(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPill, slides.length, currentBlockId])
  // Final de todo: la primera sin ver (en orden de catálogo) o, si se han visto todas, el principio.
  const firstMissing = allPills.find((p) => !p.completed)
  const firstBlockWithPills = blocksInOrder.find((id) => allPills.some((p) => blockIdOf(p) === id))

  // La dirección lleva la píldora en pantalla: «Compartir» y recargar abren esa misma.
  useEffect(() => {
    const id = slides[activeIndex]?.id
    if (id && params.get("p") !== id) setParams({ p: id }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, slides.length])

  // La activa es la que ocupa la pantalla tras el deslizamiento.
  const onScroll = () => {
    const feed = feedRef.current
    if (!feed) return
    const index = Math.round(feed.scrollTop / feed.clientHeight)
    if (index !== activeIndex) setActiveIndex(index)
  }

  const goTo = useCallback(
    (index: number) => {
      const feed = feedRef.current
      if (!feed) return
      const next = Math.min(Math.max(0, index), slides.length) // la última posición es la pantalla final
      feed.scrollTo({ top: next * feed.clientHeight, behavior: "smooth" })
    },
    [slides.length],
  )

  // Volver a la pantalla desde la que se llegó; si se entró directo (enlace, recarga), a Inicio.
  const goBack = useCallback(() => {
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1)
    else navigate("/app/inicio")
  }, [navigate])

  // Ordenador: flechas arriba/abajo del teclado, como en YouTube.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        goTo(activeIndex + 1)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        goTo(activeIndex - 1)
      } else if (e.key === "Escape") goBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeIndex, goTo, goBack])

  const height = `calc(100dvh - ${area.top + area.bottom}px)`

  return (
    <div className="fixed inset-x-0 z-10 bg-midnight" style={{ top: area.top, bottom: area.bottom }}>
      <div
        ref={feedRef}
        onScroll={onScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scrollbar-hide"
        style={{ ["--pill-h" as string]: height }}
      >
        {slides.map((item, i) => (
          <div key={`${currentBlockId}-${item.id}-${i}`} className="h-full">
            <PillSlide
              item={item}
              active={i === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              audio={audio}
              subtitlesOn={subtitlesOn}
              onToggleSubtitles={() => setSubtitlesOn((on) => !on)}
              onBack={goBack}
            />
          </div>
        ))}
        {slides.length > 0 && (
          <div className="h-full">
            <BlockEnd
              key={`end-${currentBlockId}-${activeIndex === slides.length}`}
              block={currentBlock}
              nextBlock={nextBlock}
              allSeen={!firstMissing}
              onMissing={() => {
                const id = firstMissing ? blockIdOf(firstMissing) : undefined
                if (firstMissing && id != null) goToBlock(id, firstMissing.id)
              }}
              onRestart={() => firstBlockWithPills != null && goToBlock(firstBlockWithPills)}
              background={(nextBlockId != null ? allPills.find((p) => blockIdOf(p) === nextBlockId) : slides[slides.length - 1])?.thumbnailUrl}
              active={activeIndex === slides.length}
              onNext={goToNextBlock}
              onDeepen={() => currentBlockId != null && navigate(blockSearchHref(currentBlockId))}
              onBack={goBack}
            />
          </div>
        )}
      </div>

      {/* Ordenador: flechas para pasar de píldora, a la derecha. */}
      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 sm:flex">
        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
          aria-label="Píldora anterior"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={activeIndex >= slides.length}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
          aria-label="Píldora siguiente"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

export default Pildoras
