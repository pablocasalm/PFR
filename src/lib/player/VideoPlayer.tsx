import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from "lucide-react"
import { formatDuration } from "../format"

/**
 * Reproductor HLS reutilizable (bloque 6). Reproduce una URL `.m3u8` con hls.js,
 * y usa HLS nativo en Safari. Controles a medida (play/seek/volumen/fullscreen) y,
 * en análisis, marcadores de capítulo clicables sobre la barra de progreso.
 *
 * El contrato del front no cambia: `src` es el `videoUrl` (manifiesto HLS de Cloudflare
 * Stream, o cualquier `.m3u8`). Cambiar de proveedor = cambiar de dónde sale la URL.
 */

export type PlayerChapter = { startSeconds: number; title: string }

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

const VideoPlayer = ({ src, poster, chapters = [], aspect = "16:9", initialPosition, onProgress, onEnded, endSlot }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress
  const currentRef = useRef(0)
  const durationRef = useRef(0)
  const lastReportRef = useRef(0)
  const resumedRef = useRef(false)

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

  // Cargar la fuente HLS (hls.js o nativo).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    // hls.js primero (Chrome/Firefox y Safari con MSE): habilita el selector de calidad y una
    // reproducción mejor. Chrome devuelve "maybe" en canPlayType HLS pero NO lo reproduce bien
    // de forma nativa, así que la ruta nativa se reserva para cuando hls.js NO está soportado.
    if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels
            .map((l, i) => ({ height: l.height, index: i }))
            .sort((a, b) => b.height - a.height),
        )
      })
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
    }
  }, [src])

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

  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seekTo(ratio * duration)
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
          const t = e.currentTarget.currentTime
          setCurrent(t)
          currentRef.current = t
          if (onProgress && t - lastReportRef.current >= 10) {
            lastReportRef.current = t
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
          aria-label={loading ? "Cargando" : "Reproducir"}
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
        {/* Progreso con marcadores de capítulo */}
        <div className="relative mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20" onClick={onScrub}>
          <div className="h-full rounded-full bg-neon-cyan" style={{ width: `${pct}%` }} />
          {chapters.map((ch) => (
            <button
              key={ch.startSeconds}
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

        <div className="flex items-center gap-3 text-white">
          <button onClick={togglePlay} className="transition hover:text-neon-cyan" aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="transition hover:text-neon-cyan" aria-label={muted ? "Activar sonido" : "Silenciar"}>
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
              aria-label="Volumen"
            />
          </div>

          <span className="text-xs font-medium tabular-nums text-white/90">
            {formatDuration(Math.floor(current))} / {formatDuration(Math.floor(duration))}
          </span>

          <div className="ml-auto flex items-center gap-3">
            <div className="relative flex items-center">
              <button
                onClick={() => setQualityOpen((v) => !v)}
                className={`transition hover:text-neon-cyan ${qualityOpen ? "text-neon-cyan" : ""}`}
                aria-label="Ajustes"
              >
                <Settings className="h-5 w-5" />
              </button>
              {qualityOpen && (
                <>
                  {/* Capa para cerrar al hacer clic fuera */}
                  <div className="fixed inset-0 z-10" onClick={() => setQualityOpen(false)} />
                  <div className="absolute bottom-9 right-0 z-20 min-w-[190px] overflow-hidden rounded-lg border border-white/10 bg-midnight py-1 shadow-2xl">
                    {/* Audio (§9.1/§10.1): pista con IA, aún no disponible */}
                    <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Audio</p>
                    <button
                      disabled
                      className="flex w-full cursor-not-allowed items-center justify-between gap-4 px-3 py-1.5 text-left text-xs text-white/50"
                    >
                      Audio con IA
                      <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neon-cyan">
                        Próximamente
                      </span>
                    </button>

                    {levels.length > 0 && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Calidad</p>
                        <button
                          onClick={() => selectQuality(-1)}
                          className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === -1 ? "text-neon-cyan" : "text-white"}`}
                        >
                          Automática
                          {qualityLevel === -1 && <span>✓</span>}
                        </button>
                        {levels.map((l) => (
                          <button
                            key={l.index}
                            onClick={() => selectQuality(l.index)}
                            className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs transition hover:bg-white/5 ${qualityLevel === l.index ? "text-neon-cyan" : "text-white"}`}
                          >
                            {l.height > 0 ? `${l.height}p` : `Nivel ${l.index + 1}`}
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
              aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
