import { Link } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import BookmarkButton from "../ui/BookmarkButton"
import VideoPlayer from "../player/VideoPlayer"
import PremiumLockedCover from "../video/PremiumLockedCover"
import ShortsReactions from "./ShortsReactions"

type ShortsItemProps = {
  clip: Clip
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  videoRef: (node: HTMLVideoElement | null) => void
  shouldRenderVideo: boolean
  isLocked: boolean
  onPrev?: () => void
  onNext?: () => void
}

const ShortsItem = ({
  clip,
  isActive,
  muted,
  onToggleMute,
  videoRef,
  shouldRenderVideo,
  isLocked,
  onPrev,
  onNext,
}: ShortsItemProps) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isCcOpen, setIsCcOpen] = useState(false)
  const [subtitle, setSubtitle] = useState<"off" | "es" | "en">("off")
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

  return (
    <section className="relative h-full snap-start">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-3">
        <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-4 overflow-hidden md:grid-cols-[minmax(0,1fr)_88px] md:gap-5">
          <div
            className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-lg"
            style={{ maxHeight: "calc(100vh - 180px)", aspectRatio: "16 / 9" }}
          >
            <div className="h-full w-full pr-20 md:pr-24">
              {isLocked ? (
                <PremiumLockedCover
                  thumbnailUrl={clip.thumbnailUrl}
                  title={clip.title}
                  className="h-full"
                />
              ) : shouldRenderVideo ? (
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
                />
              ) : (
                <img src={clip.thumbnailUrl} alt={clip.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/95 via-black/95 to-transparent" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-4 pb-4 pt-4">
              <div className="max-w-[70%] space-y-1 pr-24">
                <h2 className="line-clamp-2 text-base font-semibold text-white md:text-lg">
                  {clip.title}
                </h2>
                <p className="truncate text-xs text-white/70 md:text-sm">{clip.ideaKey}</p>
              </div>
              {clip.isPremium && (
                <span className="rounded-full border border-white/20 bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                  Premium
                </span>
              )}
            </div>
            <div className="absolute right-4 top-4 flex flex-col items-end gap-3">
              {!isLocked && (
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
                    to={`/analisis/${clip.id}`}
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
              )}
              <div className="flex flex-col items-center gap-3 opacity-95 transition-opacity duration-300 hover:opacity-100">
                <BookmarkButton clipId={clip.id} />
                <ShortsReactions initialCounts={clip.reactionCounts} />
              </div>
            </div>
          </div>
          <aside className="hidden w-[88px] flex-col items-center justify-center gap-3 md:flex">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={onPrev}
                disabled={!onPrev}
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/80 transition hover:bg-black/50 active:scale-95 disabled:opacity-30 disabled:hover:bg-black/30"
                aria-label="Anterior"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-base text-white/80 transition hover:bg-black/50 active:scale-95 disabled:opacity-30 disabled:hover:bg-black/30"
                aria-label="Siguiente"
              >
                ↓
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default ShortsItem
