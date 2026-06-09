import { createPortal } from "react-dom"
import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, ArrowUpRight } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { usePlayer } from "../../app/providers/PlayerProvider"
import VideoPlayer from "./VideoPlayer"

const GlobalPlayer = () => {
  const {
    media,
    isOpen,
    isMinimized,
    container,
    minimize,
    restore,
    close,
    watchPath,
    returnTo,
    videoEl,
    setVideoEl,
    playbackSnapshot,
    setPlaybackSnapshot,
  } = usePlayer()
  const navigate = useNavigate()
  const location = useLocation()

  const shouldHideMini = location.pathname.startsWith("/app/clips")

  useEffect(() => {
    if (shouldHideMini && videoEl && !videoEl.paused) {
      videoEl.pause()
    }
  }, [shouldHideMini, videoEl])

  useEffect(() => {
    if (!videoEl || !playbackSnapshot) {
      return
    }
    const shouldSeek =
      Math.abs(videoEl.currentTime - playbackSnapshot.time) > 0.5
    if (shouldSeek) {
      try {
        videoEl.currentTime = playbackSnapshot.time
      } catch {
        // ignore seek failures
      }
    }
    if (playbackSnapshot.wasPlaying && videoEl.paused) {
      void videoEl.play()
    }
  }, [videoEl, playbackSnapshot])

  if (!isOpen || !media) {
    return null
  }

  const handleMinimize = () => {
    if (videoEl) {
      setPlaybackSnapshot({ time: videoEl.currentTime, wasPlaying: !videoEl.paused })
    }
    minimize()
    navigate(returnTo ?? "/app/explore")
    if (videoEl) {
      try {
        videoEl.currentTime = videoEl.currentTime
        void videoEl.play()
      } catch {
        // ignore play errors
      }
    }
  }

  const handleRestore = () => {
    restore()
    if (watchPath) {
      navigate(watchPath)
    }
  }

  const shouldInline = container && !isMinimized
  const player = (
    <div className={shouldInline ? "w-full" : ""}>
      <VideoPlayer
        src={media.src}
        poster={media.poster}
        title={media.title}
        subtitlesEsUrl={media.subtitlesEsUrl}
        subtitlesEnUrl={media.subtitlesEnUrl}
        className="w-full"
        playerClassName={`aspect-video w-full overflow-hidden ${
          shouldInline ? "rounded-2xl" : "rounded-xl"
        }`}
        videoClassName="object-contain bg-black"
        controls={false}
        showCustomControls
        showSubtitles={false}
        manageSubtitles
        showMinimizeButton={shouldInline}
        onMinimize={handleMinimize}
        compactControls={!shouldInline}
        onReady={setVideoEl}
        autoPlay
      />
    </div>
  )

  if (shouldInline && container) {
    return createPortal(player, container)
  }

  if (shouldHideMini) {
    return null
  }

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="mini-shell"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed bottom-6 right-6 z-50 w-[320px]"
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-2xl">
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-midnight/90 px-3 py-2 text-xs text-white/70">
            <span className="truncate">{media.title ?? "Reproduciendo"}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestore}
                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white"
                aria-label="Volver al reproductor"
              >
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={close}
                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white"
                aria-label="Cerrar reproductor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {player}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default GlobalPlayer
