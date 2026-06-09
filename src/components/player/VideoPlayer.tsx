import { forwardRef, useEffect, useRef, useState } from "react"
import { Maximize, Minimize, PictureInPicture2 } from "lucide-react"

type SubtitleOption = "off" | "es" | "en"

type VideoPlayerProps = {
  src: string
  poster?: string
  title?: string
  className?: string
  playerClassName?: string
  videoClassName?: string
  subtitlesEsUrl?: string
  subtitlesEnUrl?: string
  controls?: boolean
  showCustomControls?: boolean
  showMinimizeButton?: boolean
  compactControls?: boolean
  onMinimize?: () => void
  onReady?: (video: HTMLVideoElement | null) => void
  muted?: boolean
  loop?: boolean
  autoPlay?: boolean
  isActive?: boolean
  showSubtitles?: boolean
  manageSubtitles?: boolean
  preload?: "none" | "metadata" | "auto"
  onLoadedMetadata?: () => void
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      src,
      poster,
      title,
      className = "",
      playerClassName = "",
      videoClassName = "",
      subtitlesEsUrl,
      subtitlesEnUrl,
      controls = true,
      showCustomControls = false,
      showMinimizeButton = false,
      compactControls = false,
      onMinimize,
      onReady,
      muted = false,
      loop = false,
      autoPlay = false,
      isActive,
      showSubtitles = true,
      manageSubtitles = true,
      preload = "metadata",
      onLoadedMetadata,
    },
    ref,
  ) => {
  const [subtitle, setSubtitle] = useState<SubtitleOption>("off")
  const internalRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const setRefs = (node: HTMLVideoElement | null) => {
    internalRef.current = node
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
    onReady?.(node)
  }
  const hasSubtitles = Boolean(subtitlesEsUrl || subtitlesEnUrl)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(muted)
  const [isCcOpen, setIsCcOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const ccRef = useRef<HTMLDivElement | null>(null)
  const moreRef = useRef<HTMLDivElement | null>(null)
  const [volume, setVolume] = useState(0.8)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const volumeLevel =
    isMuted || volume === 0 ? "mute" : volume < 0.5 ? "low" : "high"

  const applySubtitle = () => {
    const video = internalRef.current
    if (!video) {
      return
    }
    const tracks = Array.from(video.textTracks)
    tracks.forEach((track) => {
      track.mode = "disabled"
    })
    if (subtitle === "es") {
      const esTrack = tracks.find((track) => track.language === "es")
      if (esTrack) {
        esTrack.mode = "showing"
      }
    }
    if (subtitle === "en") {
      const enTrack = tracks.find((track) => track.language === "en")
      if (enTrack) {
        enTrack.mode = "showing"
      }
    }
  }

  useEffect(() => {
    if (!manageSubtitles) {
      return
    }
    applySubtitle()
  }, [manageSubtitles, subtitle, src])

  useEffect(() => {
    if (isActive === undefined) {
      return
    }
    const video = internalRef.current
    if (!video) {
      return
    }
    if (isActive) {
      if (autoPlay) {
        void video.play()
      }
    } else {
      video.pause()
    }
  }, [autoPlay, isActive])

  useEffect(() => {
    const video = internalRef.current
    if (!video) {
      return
    }
    video.muted = muted
    setIsMuted(muted)
    if (!muted) {
      video.volume = volume
    }
  }, [muted, volume])

  useEffect(() => {
    const video = internalRef.current
    if (!video || !showCustomControls) {
      return
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (Number.isFinite(video.duration)) {
        setDuration(video.duration)
      }
    }
    const handleLoaded = () => {
      if (Number.isFinite(video.duration)) {
        setDuration(video.duration)
      }
    }
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoaded)
    setIsPlaying(!video.paused)
    setIsMuted(video.muted)
    if (!video.muted && Number.isFinite(video.volume)) {
      setVolume(video.volume)
    }
    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoaded)
    }
  }, [showCustomControls, src])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ccRef.current || ccRef.current.contains(event.target as Node)) {
        return
      }
      setIsCcOpen(false)
    }
    if (isCcOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isCcOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!moreRef.current || moreRef.current.contains(event.target as Node)) {
        return
      }
      setIsMoreOpen(false)
    }
    if (isMoreOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMoreOpen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    handleFullscreenChange()
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) {
      return "0:00"
    }
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const togglePlay = () => {
    const video = internalRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  const toggleMute = () => {
    const video = internalRef.current
    if (!video) {
      return
    }
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const seekTo = (nextValue: number) => {
    const video = internalRef.current
    if (!video) {
      return
    }
    video.currentTime = nextValue
    setCurrentTime(nextValue)
  }

  const requestFullscreen = () => {
    const container = containerRef.current
    if (!container) {
      return
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void container.requestFullscreen()
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-glow ${playerClassName}`}
      >
        <video
          ref={setRefs}
          className={`h-full w-full ${videoClassName}`}
          src={src}
          poster={poster}
          controls={controls && !showCustomControls}
          playsInline
          muted={isMuted}
          loop={loop}
          autoPlay={autoPlay}
          preload={preload}
          aria-label={title}
          onLoadedMetadata={() => {
            if (manageSubtitles) {
              applySubtitle()
            }
            onLoadedMetadata?.()
          }}
        >
          {subtitlesEsUrl && (
            <track kind="subtitles" srcLang="es" label="Español" src={subtitlesEsUrl} />
          )}
          {subtitlesEnUrl && (
            <track kind="subtitles" srcLang="en" label="Inglés" src={subtitlesEnUrl} />
          )}
        </video>
        {showCustomControls && (
          <>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
              {!compactControls && (
                <>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={(event) => seekTo(Number(event.target.value))}
                    className="h-1 w-full cursor-pointer accent-white"
                    aria-label="Progreso del video"
                  />
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white"
                    aria-label={isPlaying ? "Pausar" : "Reproducir"}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path d="M8 5l12 7-12 7z" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                  {!compactControls && (
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-2 py-1">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
                        aria-label={isMuted ? "Activar sonido" : "Silenciar"}
                      >
                        <span className="relative h-5 w-5">
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={`absolute inset-0 h-5 w-5 transition-all duration-150 ${
                              volumeLevel === "mute"
                                ? "scale-100 opacity-100"
                                : "scale-75 opacity-0"
                            }`}
                          >
                            <path
                              d="M11 5L6 9H3v6h3l5 4V5z"
                              fill="currentColor"
                            />
                            <path
                              d="M16 9l5 6m0-6l-5 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={`absolute inset-0 h-5 w-5 transition-all duration-150 ${
                              volumeLevel === "low"
                                ? "scale-100 opacity-100"
                                : "scale-75 opacity-0"
                            }`}
                          >
                            <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
                            <path
                              d="M15 11a2.5 2.5 0 0 1 0 2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={`absolute inset-0 h-5 w-5 transition-all duration-150 ${
                              volumeLevel === "high"
                                ? "scale-100 opacity-100"
                                : "scale-75 opacity-0"
                            }`}
                          >
                            <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
                            <path
                              d="M15.5 8.5a5 5 0 0 1 0 7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={(event) => {
                          const video = internalRef.current
                          if (!video) {
                            return
                          }
                          const next = Number(event.target.value)
                          setVolume(next)
                          video.volume = next
                          if (next === 0) {
                            video.muted = true
                            setIsMuted(true)
                          } else {
                            video.muted = false
                            setIsMuted(false)
                          }
                        }}
                        className="h-1 w-20 cursor-pointer accent-white"
                        aria-label="Volumen"
                      />
                    </div>
                  )}
                </div>
                {!compactControls && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {hasSubtitles && (
                      <div className="relative" ref={ccRef}>
                        <button
                          type="button"
                          onClick={() => setIsCcOpen((prev) => !prev)}
                          className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xs font-semibold uppercase text-white/80"
                          aria-label="Subtítulos"
                        >
                          CC
                        </button>
                        {isCcOpen && (
                          <div className="absolute left-1/2 bottom-12 z-30 w-40 -translate-x-1/2 rounded-2xl border border-white/10 bg-midnight/95 p-2 text-[11px] text-white shadow-xl">
                            {[
                              { label: "Apagados", value: "off" },
                              { label: "Español", value: "es" },
                              { label: "Inglés", value: "en" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setSubtitle(option.value as SubtitleOption)
                                  setIsCcOpen(false)
                                }}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                                  subtitle === option.value
                                    ? "bg-white text-midnight"
                                    : "hover:bg-white/10"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative" ref={moreRef}>
                      <button
                        type="button"
                        onClick={() => setIsMoreOpen((prev) => !prev)}
                        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80"
                        aria-label="Más opciones"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
                        </svg>
                      </button>
                      {isMoreOpen && (
                        <div className="absolute right-0 bottom-12 z-30 w-44 rounded-2xl border border-white/10 bg-midnight/95 p-2 text-[11px] text-white shadow-xl">
                          {[
                            { label: "Compartir", value: "share" },
                            { label: "Copiar enlace", value: "copy" },
                            { label: "Reportar", value: "report" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setIsMoreOpen(false)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {showMinimizeButton && (
                      <button
                        type="button"
                        onClick={onMinimize}
                        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white"
                        aria-label="Minimizar reproductor"
                      >
                        <PictureInPicture2 className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={requestFullscreen}
                      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white"
                      aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <Maximize className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {showSubtitles && manageSubtitles && !showCustomControls && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Subtítulos
          </span>
          {hasSubtitles ? (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-white/70">
              {[
                { label: "Apagados", value: "off" },
                { label: "Español", value: "es" },
                { label: "Inglés", value: "en" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSubtitle(option.value as SubtitleOption)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    subtitle === option.value ? "bg-white text-midnight" : "hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs text-white/40">Subtítulos no disponibles</span>
          )}
        </div>
      )}
    </div>
  )
  },
)

VideoPlayer.displayName = "VideoPlayer"

export default VideoPlayer
