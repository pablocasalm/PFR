import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react"
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

type Props = {
  src: string
  poster?: string
  chapters?: PlayerChapter[]
  /** "16:9" (horizontal, por defecto) o "9:16" (experiencia vertical móvil). */
  aspect?: "16:9" | "9:16"
}

const VideoPlayer = ({ src, poster, chapters = [], aspect = "16:9" }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)

  // Cargar la fuente HLS (hls.js o nativo).
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari reproduce HLS de forma nativa.
      video.src = src
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    }
  }, [src])

  // Sincronizar el estado de pantalla completa con el evento del navegador.
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play()
    else v.pause()
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
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen()
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => {
          setMuted(e.currentTarget.muted)
          setVolume(e.currentTarget.volume)
        }}
        playsInline
      />

      {/* Botón central de play cuando está pausado */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Reproducir"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm transition hover:bg-black/60">
            <Play className="h-7 w-7 text-white" fill="currentColor" />
          </span>
        </button>
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

          <button onClick={toggleFullscreen} className="ml-auto transition hover:text-neon-cyan" aria-label="Pantalla completa">
            <Maximize className="h-5 w-5" />
          </button>
          <span className="sr-only">{fullscreen ? "En pantalla completa" : ""}</span>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
