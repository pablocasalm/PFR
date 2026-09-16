import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import Hls from "hls.js"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Captions } from "lucide-react"
import { formatDuration } from "../format"
import { useI18n } from "../i18n/store"

/**
 * Reproductor HLS reutilizable (bloque 6). Reproduce una URL `.m3u8` con hls.js,
 * y usa HLS nativo en Safari. Controles a medida (play/seek/volumen/fullscreen) y,
 * en análisis, marcadores de capítulo clicables sobre la barra de progreso.
 *
 * El contrato del front no cambia: `src` es el `videoUrl` (manifiesto HLS de Cloudflare
 * Stream, o cualquier `.m3u8`). Cambiar de proveedor = cambiar de dónde sale la URL.
 */

export type PlayerChapter = { startSeconds: number; title: string }

/** API imperativa expuesta vía ref — permite saltar a un momento del vídeo desde fuera
 * (p. ej. al hacer clic en un capítulo listado en un panel aparte, §reporte de beta). */
export type VideoPlayerHandle = { seekTo: (seconds: number) => void }

// Safari en iPhone no soporta Fullscreen API sobre el contenedor (solo en iPad, iPadOS 16.4+):
// hay que usar el método nativo del propio <video>, que además dispara sus propios eventos
// en vez de "fullscreenchange". Mismo workaround que usa YouTube en iOS.
type IOSVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void
  webkitExitFullscreen?: () => void
  webkitDisplayingFullscreen?: boolean
}

type Props = {
  src: string
  /** URL del vídeo doblado al inglés (HeyGen), si existe. Sin ella, el selector de idioma
   * se queda en el placeholder "Próximamente". */
  srcEn?: string
  poster?: string
  chapters?: PlayerChapter[]
  /** "16:9" (horizontal, por defecto) o "9:16" (experiencia vertical móvil). */
  aspect?: "16:9" | "9:16"
  /** Punto (segundos) donde reanudar al cargar (§7.2). */
  initialPosition?: number
  /** Se llama periódicamente y al pausar/salir para guardar el progreso de visionado. */
  onProgress?: (positionSeconds: number, durationSeconds: number) => void
  /** Se dispara al terminar el vídeo (para autoplay / "siguiente", §9.7/§10.7). */
  onEnded?: () => void
  /** Contenido superpuesto al terminar (tarjeta "Siguiente en 3, 2, 1…"). Se ve también en
   * fullscreen. Recibe `dismiss` para poder cerrar la tarjeta y quedarse en el vídeo actual
   * (p. ej. al cancelar el autoplay) sin tener que ir al siguiente ni salir de la página. */
  endSlot?: (dismiss: () => void) => React.ReactNode
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ src, srcEn, poster, chapters = [], aspect = "16:9", initialPosition, onProgress, onEnded, endSlot }, ref) => {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const currentRef = useRef(0)
  const durationRef = useRef(0)
  const lastReportRef = useRef(0)
  const resumedRef = useRef(false)
  const scrubbingRef = useRef(false)
  // Al cambiar de idioma (§HeyGen), se guarda aquí el punto/estado de reproducción justo antes
  // de recargar la fuente, para restaurarlo cuando el nuevo manifiesto esté listo — si no, cambiar
  // de idioma volvería siempre al minuto 0.
  const switchStateRef = useRef<{ time: number; wasPlaying: boolean } | null>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([])
  const [qualityLevel, setQualityLevel] = useState(-1) // -1 = auto (ABR)
  const [qualityOpen, setQualityOpen] = useState(false)
  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState<"es" | "en">("es")
  const [subtitleTracks, setSubtitleTracks] = useState<{ index: number; label: string }[]>([])
  const [subtitleTrack, setSubtitleTrack] = useState(-1) // -1 = desactivados
  const [subtitlesMenuOpen, setSubtitlesMenuOpen] = useState(false)

  const activeSrc = lang === "en" && srcEn ? srcEn : src

  // Cambia de idioma preservando el punto de reproducción y si estaba sonando — es un cambio de
  // fuente completo (el vídeo EN es un uid de Cloudflare distinto, no una pista alternativa
  // dentro del mismo manifiesto), así que hay que recargar y luego restaurar el estado.
  const switchLanguage = (next: "es" | "en") => {
    if (next === lang) return
    switchStateRef.current = { time: currentRef.current, wasPlaying: playing }
    setLang(next)
    setQualityOpen(false)
  }

  // Cargar la fuente HLS (hls.js o nativo).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !activeSrc) return

    setSubtitleTracks([])
    setSubtitleTrack(-1)

    const restoreAfterSwitch = () => {
      const pending = switchStateRef.current
      if (!pending) return
      switchStateRef.current = null
      video.currentTime = pending.time
      if (pending.wasPlaying) video.play().catch(() => {})
    }

    // hls.js primero (Chrome/Firefox y Safari con MSE): habilita el selector de calidad y una
    // reproducción mejor. Chrome devuelve "maybe" en canPlayType HLS pero NO lo reproduce bien
    // de forma nativa, así que la ruta nativa se reserva para cuando hls.js NO está soportado.
    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(activeSrc)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels
            .map((l, i) => ({ height: l.height, index: i }))
            .sort((a, b) => b.height - a.height),
        )
        restoreAfterSwitch()
      })
      // hls.js puebla `subtitleTracks` de forma asíncrona (parsea las playlists de subtítulos
      // aparte del manifiesto principal) — llega en este evento, no en MANIFEST_PARSED, si no
      // el array todavía está vacío y el selector de subtítulos nunca aparece.
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        setSubtitleTracks(
          hls.subtitleTracks.map((track, i) => ({
            index: i,
            label: track.name || t("video-player.subtitle-track", "Subtítulos {n}", { n: i + 1 }),
          })),
        )
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeSrc
      video.addEventListener("loadedmetadata", restoreAfterSwitch, { once: true })
    }
  }, [activeSrc])

  // Sincronizar el estado de pantalla completa con el evento del navegador.
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  // Safari en iPhone no dispara "fullscreenchange" para el modo nativo del <video>: escucha
  // sus propios eventos webkit para que el icono de pantalla completa refleje el estado real.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onBegin = () => setFullscreen(true)
    const onEnd = () => setFullscreen(false)
    video.addEventListener("webkitbeginfullscreen", onBegin)
    video.addEventListener("webkitendfullscreen", onEnd)
    return () => {
      video.removeEventListener("webkitbeginfullscreen", onBegin)
      video.removeEventListener("webkitendfullscreen", onEnd)
    }
  }, [])

  // Reporta el progreso de visionado (guardado en el historial).
  const report = () => {
    const cb = onProgressRef.current
    if (cb && durationRef.current > 0 && currentRef.current > 0) {
      cb(Math.floor(currentRef.current), Math.floor(durationRef.current))
    }
  }

  // Guardar progreso al desmontar (salir del vídeo).
  useEffect(() => {
    return () => {
      const cb = onProgressRef.current
      if (cb && durationRef.current > 0 && currentRef.current > 0) {
        cb(Math.floor(currentRef.current), Math.floor(durationRef.current))
      }
    }
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      // Mientras el vídeo buferiza, "play" no se nota (el botón no cambia) y la gente vuelve
      // a pulsar varias veces (§reporte de beta) — se marca "cargando" hasta que arranca de
      // verdad (o falla), y el botón se desactiva mientras tanto para no acumular clics.
      setLoading(true)
      v.play().catch(() => setLoading(false))
    } else v.pause()
  }

  const seekTo = (seconds: number) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(seconds, duration || seconds))
  }

  useImperativeHandle(ref, () => ({ seekTo }))

  // Pointer Events (no onClick/onDrag): unifica ratón y táctil, y permite arrastrar continuo
  // para avanzar/retroceder, no solo un tap puntual (§reporte de beta — en móvil no se podía
  // "arrastrar el cursor" para buscar, solo tocar servía como único punto, si es que llegaba
  // a registrarse el toque en vez de interpretarse como scroll de la página).
  const scrubToClientX = (clientX: number, rect: DOMRect) => {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    seekTo(ratio * duration)
  }
  const onScrubStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubbingRef.current = true
    scrubToClientX(e.clientX, e.currentTarget.getBoundingClientRect())
  }
  const onScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return
    scrubToClientX(e.clientX, e.currentTarget.getBoundingClientRect())
  }
  const onScrubEnd = () => {
    scrubbingRef.current = false
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (v) v.muted = !v.muted
  }

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const value = Number(e.target.value)
    v.volume = value
    v.muted = value === 0
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    const video = videoRef.current as IOSVideoElement | null

    if (video?.webkitDisplayingFullscreen) {
      video.webkitExitFullscreen?.()
      return
    }
    if (document.fullscreenElement) {
      document.exitFullscreen()
      return
    }
    if (container?.requestFullscreen) {
      container.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.())
    } else {
      video?.webkitEnterFullscreen?.()
    }
  }

  const selectQuality = (index: number) => {
    const hls = hlsRef.current
    if (hls) hls.currentLevel = index // -1 = auto (ABR)
    setQualityLevel(index)
    setQualityOpen(false)
  }

  const selectSubtitle = (index: number) => {
    const hls = hlsRef.current
    if (hls) {
      hls.subtitleTrack = index
      hls.subtitleDisplay = index !== -1 // hls.js no pinta las cues por defecto
    }
    setSubtitleTrack(index)
    setSubtitlesMenuOpen(false)
  }

  // Con una sola pista (el caso normal: un idioma de subtítulos por vídeo) el botón dedicado
  // alterna directamente on/off, sin abrir un menú — solo con varias pistas hace falta elegir.
  // Sin pistas, el botón se ve pero no hace nada (queda en gris, ver abajo).
  const toggleSubtitles = () => {
    if (subtitleTracks.length === 0) return
    if (subtitleTracks.length > 1) {
      setSubtitlesMenuOpen((v) => !v)
      return
    }
    selectSubtitle(subtitleTrack === -1 ? subtitleTracks[0].index : -1)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const aspectCls = aspect === "9:16" ? "aspect-[9/16]" : "aspect-video"

  return (
    <div
      ref={containerRef}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black ${aspectCls}`}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="h-full w-full bg-black object-contain"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true)
          setEnded(false)
          setLoading(false)
        }}
        onPlaying={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPause={() => {
          setPlaying(false)
          setLoading(false)
          report()
        }}
        onEnded={() => {
          setPlaying(false)
          report()
          setEnded(true)
          onEnded?.()
          // En iPhone, ver "en horizontal" suele significar el modo nativo de pantalla completa
          // (webkitEnterFullscreen) — la tarjeta "Siguiente" vive fuera de ese elemento nativo y
          // no se ve ahí, así que el countdown avanzaba de vídeo sin que nadie se enterara (§
          // reporte de beta). Al terminar, se sale de ese modo para que la tarjeta sea visible.
          const video = videoRef.current as IOSVideoElement | null
          if (video?.webkitDisplayingFullscreen) video.webkitExitFullscreen?.()
        }}
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime
          setCurrent(time)
          currentRef.current = time
          if (onProgress && time - lastReportRef.current >= 10) {
            lastReportRef.current = time
            report()
          }
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          setDuration(d)
          durationRef.current = d
          if (initialPosition && initialPosition > 0 && !resumedRef.current) {
            resumedRef.current = true
            e.currentTarget.currentTime = initialPosition
          }
        }}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted)
          setVolume(e.currentTarget.volume)
        }}
        playsInline
      />

      {/* Botón central de play cuando está pausado (con spinner mientras carga) */}
      {!playing && (
        <button
          onClick={togglePlay}
          disabled={loading}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={loading ? t("video-player.loading", "Cargando") : t("video-player.play", "Reproducir")}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm transition hover:bg-black/60">
            {loading ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Play className="h-7 w-7 text-white" fill="currentColor" />
            )}
          </span>
        </button>
      )}

      {/* Tarjeta "Siguiente" al terminar (autoplay §9.7/§10.7). Cubre el vídeo, también en fullscreen. */}
      {ended && endSlot && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          {endSlot(() => setEnded(false))}
        </div>
      )}

      {/* Barra de controles */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-12 opacity-0 transition group-hover:opacity-100">
        {/* Progreso con marcadores de capítulo. touch-none evita que el gesto de arrastrar se
            interprete como scroll de la página en móvil — sin esto, el primer intento de
            arrastre se lo quedaba el navegador en vez de la barra. */}
        <div
          className="relative -my-2 flex h-5 w-full cursor-pointer touch-none items-center"
          onPointerDown={onScrubStart}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubEnd}
          onPointerCancel={onScrubEnd}
        >
        <div className="relative h-1.5 w-full rounded-full bg-white/20">
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${pct}%` }} />
          {chapters.map((ch) => (
            <button
              key={ch.startSeconds}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                seekTo(ch.startSeconds)
              }}
              title={`${formatDuration(ch.startSeconds)} · ${ch.title}`}
              className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 transition hover:bg-white"
              style={{ left: `${duration > 0 ? (ch.startSeconds / duration) * 100 : 0}%` }}
            />
          ))}
        </div>
        </div>

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} className="transition hover:text-neon-cyan" aria-label={playing ? t("video-player.pause", "Pausar") : t("video-player.play", "Reproducir")}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="transition hover:text-neon-cyan" aria-label={muted ? t("video-player.unmute", "Activar sonido") : t("video-player.mute", "Silenciar")}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={onVolume}
              className="h-1 w-20 cursor-pointer accent-neon-cyan"
              aria-label={t("video-player.volume", "Volumen")}
            />
          </div>

          <span className="text-xs font-medium tabular-nums text-white/90">
            {formatDuration(Math.floor(current))} / {formatDuration(Math.floor(duration))}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative flex items-center">
              <button
                onClick={toggleSubtitles}
                disabled={subtitleTracks.length === 0}
                className={`transition ${
                  subtitleTracks.length === 0
                    ? "cursor-not-allowed text-white/25"
                    : `hover:text-neon-cyan ${subtitleTrack !== -1 ? "text-neon-cyan" : ""}`
                }`}
                aria-label={
                  subtitleTracks.length === 0
                    ? t("video-player.subtitles-unavailable", "Subtítulos no disponibles")
                    : subtitleTrack !== -1
                      ? t("video-player.subtitles-off", "Desactivados")
                      : t("video-player.subtitles-title", "Subtítulos")
                }
                aria-pressed={subtitleTrack !== -1}
              >
                <Captions className="h-5 w-5" />
              </button>
              {subtitlesMenuOpen && subtitleTracks.length > 1 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSubtitlesMenuOpen(false)} />
                  <div className="absolute bottom-9 right-0 z-20 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-midnight py-1 shadow-2xl">
                    <button
                      onClick={() => selectSubtitle(-1)}
                      className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${subtitleTrack === -1 ? "text-neon-cyan" : "text-white"}`}
                    >
                      {t("video-player.subtitles-off", "Desactivados")}
                      {subtitleTrack === -1 && <span>✓</span>}
                    </button>
                    {subtitleTracks.map((track) => (
                      <button
                        key={track.index}
                        onClick={() => selectSubtitle(track.index)}
                        className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${subtitleTrack === track.index ? "text-neon-cyan" : "text-white"}`}
                      >
                        {track.label}
                        {subtitleTrack === track.index && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative flex items-center">
              <button
                onClick={() => setQualityOpen((v) => !v)}
                className={`transition hover:text-neon-cyan ${qualityOpen ? "text-neon-cyan" : ""}`}
                aria-label={t("video-player.settings", "Ajustes")}
              >
                <Settings className="h-5 w-5" />
              </button>
              {qualityOpen && (
                <>
                  {/* Capa para cerrar al hacer clic fuera */}
                  <div className="fixed inset-0 z-10" onClick={() => setQualityOpen(false)} />
                  <div className="absolute bottom-9 right-0 z-20 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-midnight py-1 shadow-2xl">
                    {/* Idioma (§9.1/§10.1): vídeo doblado al inglés (HeyGen), si existe. */}
                    <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("video-player.language-title", "Idioma")}</p>
                    {srcEn ? (
                      <>
                        <button
                          onClick={() => switchLanguage("es")}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${lang === "es" ? "text-neon-cyan" : "text-white"}`}
                        >
                          {/* Nombre del idioma en sí mismo: no se traduce con el idioma de la interfaz. */}
                          Español
                          {lang === "es" && <span>✓</span>}
                        </button>
                        <button
                          onClick={() => switchLanguage("en")}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${lang === "en" ? "text-neon-cyan" : "text-white"}`}
                        >
                          English (AI dub)
                          {lang === "en" && <span>✓</span>}
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-white/50"
                      >
                        {t("video-player.ai-audio", "Audio con IA")}
                        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neon-cyan">
                          {t("video-player.coming-soon", "Próximamente")}
                        </span>
                      </button>
                    )}

                    {levels.length > 0 && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{t("video-player.quality-title", "Calidad")}</p>
                        <button
                          onClick={() => selectQuality(-1)}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === -1 ? "text-neon-cyan" : "text-white"}`}
                        >
                          {t("video-player.quality-auto", "Automática")}
                          {qualityLevel === -1 && <span>✓</span>}
                        </button>
                        {levels.map((l) => (
                          <button
                            key={l.index}
                            onClick={() => selectQuality(l.index)}
                            className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === l.index ? "text-neon-cyan" : "text-white"}`}
                          >
                            {l.height > 0 ? `${l.height}p` : t("video-player.quality-level", "Nivel {n}", { n: l.index + 1 })}
                            {qualityLevel === l.index && <span>✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="transition hover:text-neon-cyan"
              aria-label={fullscreen ? t("video-player.fullscreen-exit", "Salir de pantalla completa") : t("video-player.fullscreen", "Pantalla completa")}
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})

export default VideoPlayer
