import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"

type PlayerMedia = {
  src: string
  poster?: string
  title?: string
  subtitlesEsUrl?: string
  subtitlesEnUrl?: string
}

type PlayerContextValue = {
  media: PlayerMedia | null
  isOpen: boolean
  isMinimized: boolean
  container: HTMLElement | null
  watchPath: string | null
  returnTo: string | null
  videoEl: HTMLVideoElement | null
  playbackSnapshot: { time: number; wasPlaying: boolean } | null
  open: (media: PlayerMedia) => void
  close: () => void
  minimize: () => void
  restore: () => void
  setContainer: (node: HTMLElement | null) => void
  setVideoEl: (node: HTMLVideoElement | null) => void
  setPlaybackSnapshot: (snapshot: { time: number; wasPlaying: boolean } | null) => void
}

const PlayerContext = createContext<PlayerContextValue | null>(null)

type PlayerProviderProps = {
  children: ReactNode
}

export const PlayerProvider = ({ children }: PlayerProviderProps) => {
  const [media, setMedia] = useState<PlayerMedia | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [watchPath, setWatchPath] = useState<string | null>(null)
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [playbackSnapshot, setPlaybackSnapshot] = useState<{
    time: number
    wasPlaying: boolean
  } | null>(null)

  const open = useCallback(
    (nextMedia: PlayerMedia & { watchPath?: string; returnTo?: string }) => {
      setMedia(nextMedia)
      setWatchPath(nextMedia.watchPath ?? null)
      setReturnTo(nextMedia.returnTo ?? null)
      setIsMinimized(false)
    },
    [],
  )

  const close = useCallback(() => {
    setMedia(null)
    setIsMinimized(false)
    setWatchPath(null)
    setReturnTo(null)
    setPlaybackSnapshot(null)
  }, [])

  const minimize = useCallback(() => setIsMinimized(true), [])
  const restore = useCallback(() => setIsMinimized(false), [])
  const setContainerStable = useCallback((node: HTMLElement | null) => {
    setContainer(node)
  }, [])
  const setVideoElStable = useCallback((node: HTMLVideoElement | null) => {
    setVideoEl(node)
  }, [])

  const value = useMemo(
    () => ({
      media,
      isOpen: Boolean(media),
      isMinimized,
      container,
      watchPath,
      returnTo,
      videoEl,
      playbackSnapshot,
      open,
      close,
      minimize,
      restore,
      setContainer: setContainerStable,
      setVideoEl: setVideoElStable,
      setPlaybackSnapshot,
    }),
    [
      media,
      isMinimized,
      container,
      watchPath,
      returnTo,
      videoEl,
      playbackSnapshot,
      open,
      close,
      minimize,
      restore,
      setContainerStable,
      setVideoElStable,
      setPlaybackSnapshot,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("usePlayer must be used within PlayerProvider")
  }
  return context
}
