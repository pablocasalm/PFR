import { forwardRef, useEffect, useRef, useState } from "react"

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
  const setRefs = (node: HTMLVideoElement | null) => {
    internalRef.current = node
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }
  const hasSubtitles = Boolean(subtitlesEsUrl || subtitlesEnUrl)

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

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-glow ${playerClassName}`}
      >
        <video
          ref={setRefs}
          className={`h-full w-full ${videoClassName}`}
          src={src}
          poster={poster}
          controls={controls}
          playsInline
          muted={muted}
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
      </div>
      {showSubtitles && manageSubtitles && (
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
