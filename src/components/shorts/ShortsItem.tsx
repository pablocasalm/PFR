import { Link } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import BookmarkButton from "../ui/BookmarkButton"
import VideoPlayer from "../player/VideoPlayer"
import ShortsReactions from "./ShortsReactions"

type ShortsItemProps = {
  clip: Clip
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  videoRef: (node: HTMLVideoElement | null) => void
  shouldRenderVideo: boolean
}

const ShortsItem = ({
  clip,
  isActive,
  muted,
  onToggleMute,
  videoRef,
  shouldRenderVideo,
}: ShortsItemProps) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isCcOpen, setIsCcOpen] = useState(false)
  const [subtitle, setSubtitle] = useState<"off" | "es" | "en">("off")
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical")
  const [aspectRatio, setAspectRatio] = useState(9 / 16)
  const [isPaused, setIsPaused] = useState(false)
  const [showPauseOverlay, setShowPauseOverlay] = useState(false)
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause">("play")
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const pauseOverlayTimeoutRef = useRef<number | null>(null)
  const isHorizontal = orientation === "horizontal"
  const setVideoRef = (node: HTMLVideoElement | null) => {
    localVideoRef.current = node
    videoRef(node)
  }

  useEffect(() => {
    const video = localVideoRef.current
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
  }, [subtitle])

  useEffect(() => {
    const image = new Image()
    image.src = clip.thumbnailUrl
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) {
        setOrientation(image.naturalHeight >= image.naturalWidth ? "vertical" : "horizontal")
        setAspectRatio(image.naturalWidth / image.naturalHeight)
      }
    }
  }, [clip.thumbnailUrl])

  useEffect(() => {
    const video = localVideoRef.current
    if (!video) {
      return
    }
    const handlePlay = () => setIsPaused(false)
    const handlePause = () => setIsPaused(true)
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (Number.isFinite(video.duration)) {
        setDuration(video.duration)
      }
    }
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handlePause)
    video.addEventListener("timeupdate", handleTimeUpdate)
    setIsPaused(video.paused)
    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handlePause)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [clip.id, shouldRenderVideo])

  useEffect(() => {
    if (pauseOverlayTimeoutRef.current) {
      window.clearTimeout(pauseOverlayTimeoutRef.current)
      pauseOverlayTimeoutRef.current = null
    }
    if (isPaused) {
      setOverlayIcon("play")
      setShowPauseOverlay(true)
      pauseOverlayTimeoutRef.current = window.setTimeout(() => {
        setShowPauseOverlay(false)
        pauseOverlayTimeoutRef.current = null
      }, 1000)
    } else {
      setOverlayIcon("pause")
      setShowPauseOverlay(true)
      pauseOverlayTimeoutRef.current = window.setTimeout(() => {
        setShowPauseOverlay(false)
        pauseOverlayTimeoutRef.current = null
      }, 1000)
    }
    return () => {
      if (pauseOverlayTimeoutRef.current) {
        window.clearTimeout(pauseOverlayTimeoutRef.current)
        pauseOverlayTimeoutRef.current = null
      }
    }
  }, [isPaused])

  const handleMetadataLoaded = () => {
    const video = localVideoRef.current
    if (!video) {
      return
    }
    if (video.videoWidth && video.videoHeight) {
      setOrientation(video.videoHeight >= video.videoWidth ? "vertical" : "horizontal")
      setAspectRatio(video.videoWidth / video.videoHeight)
    }
    if (Number.isFinite(video.duration)) {
      setDuration(video.duration)
    }
  }

  const formatTime = (value: number) => {
    if (!Number.isFinite(value)) {
      return "0:00"
    }
    const minutes = Math.floor(value / 60)
    const seconds = Math.floor(value % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const togglePlay = () => {
    const video = localVideoRef.current
    if (!video) {
      return
    }
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  const frameStyles = useMemo(() => {
    if (orientation === "horizontal") {
      return {
        className: "max-w-[1120px]",
        aspectRatio: aspectRatio,
        maxHeight: "calc(100% - 64px)",
        translateY: "0px",
      }
    }
    return {
      className: "max-w-[560px]",
      aspectRatio: aspectRatio,
      maxHeight: "calc(100% - 112px)",
      translateY: "10px",
    }
  }, [aspectRatio, orientation])

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-3">
        <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_88px] md:gap-5">
          <div
            className={`relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg ${frameStyles.className}`}
            style={{
              maxHeight: frameStyles.maxHeight,
              aspectRatio: frameStyles.aspectRatio,
              transform: `translateY(${frameStyles.translateY})`,
            }}
          >
            <div className="relative h-full w-full">
              {shouldRenderVideo ? (
                isHorizontal ? (
                  <div
                    className="h-full w-full cursor-pointer"
                    onClick={togglePlay}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        togglePlay()
                      }
                    }}
                  >
                    <VideoPlayer
                      ref={setVideoRef}
                      src={clip.clipVideoUrl}
                      poster={clip.thumbnailUrl}
                      title={clip.title}
                      subtitlesEsUrl={clip.subtitlesEsUrl}
                      subtitlesEnUrl={clip.subtitlesEnUrl}
                      controls={false}
                      muted={muted}
                      loop
                      autoPlay={isActive}
                      isActive={isActive}
                      showSubtitles={false}
                      manageSubtitles={false}
                      preload="metadata"
                      playerClassName="h-full w-full rounded-none border-0 bg-transparent shadow-none"
                      videoClassName="h-full w-full object-contain bg-black"
                      onLoadedMetadata={handleMetadataLoaded}
                    />
                  </div>
                ) : (
                  <div
                    className="h-full w-full cursor-pointer"
                    onClick={togglePlay}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        togglePlay()
                      }
                    }}
                  >
                    <VideoPlayer
                      ref={setVideoRef}
                      src={clip.clipVideoUrl}
                      poster={clip.thumbnailUrl}
                      title={clip.title}
                      subtitlesEsUrl={clip.subtitlesEsUrl}
                      subtitlesEnUrl={clip.subtitlesEnUrl}
                      controls={false}
                      muted={muted}
                      loop
                      autoPlay={isActive}
                      isActive={isActive}
                      showSubtitles={false}
                      manageSubtitles={false}
                      preload="metadata"
                      playerClassName="h-full w-full rounded-none border-0 bg-transparent shadow-none"
                      videoClassName="h-full w-full object-contain bg-black"
                      onLoadedMetadata={handleMetadataLoaded}
                    />
                  </div>
                )
              ) : isHorizontal ? (
                <img
                  src={clip.thumbnailUrl}
                  alt={clip.title}
                  className="h-full w-full object-contain bg-black"
                />
              ) : (
                <img
                  src={clip.thumbnailUrl}
                  alt={clip.title}
                  className="h-full w-full object-contain bg-black"
                />
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/95 via-black/95 to-transparent" />
            {shouldRenderVideo && (
              <div
                className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                  showPauseOverlay ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform duration-300 ${
                    showPauseOverlay ? "scale-100" : "scale-90"
                  }`}
                >
                  {overlayIcon === "play" ? (
                    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                      <path d="M8 5l12 7-12 7z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
                      <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            {shouldRenderVideo && (
              <div className="absolute inset-x-4 bottom-3 z-30">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(event) => {
                    const video = localVideoRef.current
                    if (!video) {
                      return
                    }
                    const next = Number(event.target.value)
                    video.currentTime = next
                    setCurrentTime(next)
                  }}
                  className="h-1 w-full cursor-pointer accent-white"
                  aria-label="Progreso del clip"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pb-4 pt-4">
              <div className="max-w-[70%] space-y-1 pr-24">
                <h2 className="line-clamp-2 text-base font-semibold text-white md:text-lg">
                  {clip.title}
                </h2>
                <p className="truncate text-xs text-white/70 md:text-sm">{clip.ideaKey}</p>
              </div>
            </div>
            <div className="absolute right-4 top-4 flex flex-col items-end gap-3">
              <div className="relative flex items-center gap-2">
                  {shouldRenderVideo && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsCcOpen((prev) => !prev)}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-xs font-semibold text-white"
                        aria-label="Subtítulos"
                      >
                        CC
                      </button>
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white"
                        aria-label={muted ? "Activar sonido" : "Silenciar"}
                      >
                        {muted ? "🔇" : "🔊"}
                      </button>
                    </>
                  )}
                  <Link
                    to={`/video/${clip.id}`}
                    className="focus-ring rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-midnight shadow-sm hover:bg-white"
                  >
                    Ver completo
                  </Link>
                  {isCcOpen && (
                    <div className="absolute right-0 top-10 w-40 rounded-2xl border border-white/10 bg-midnight/95 p-2 text-[11px] text-white shadow-xl">
                      {[
                        { label: "Apagados", value: "off" },
                        { label: "Español", value: "es" },
                        { label: "Inglés", value: "en" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSubtitle(option.value as "off" | "es" | "en")
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
            </div>
            <div className="absolute right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-3 scale-90 opacity-95 transition-opacity duration-300 hover:opacity-100 md:right-6 md:gap-4 md:scale-95">
              <BookmarkButton clipId={clip.id} />
              <ShortsReactions initialCounts={clip.reactionCounts} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ShortsItem
