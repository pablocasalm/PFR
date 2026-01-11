import { useCallback, useEffect, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import ShortsItem from "./ShortsItem"
import { useEntitlement } from "../../app/providers/EntitlementProvider"

type ShortsFeedProps = {
  clips: Clip[]
}

const ShortsFeed = ({ clips }: ShortsFeedProps) => {
  const INDEX_STORAGE_KEY = "pfr_home_index_v1"
  const MUTE_STORAGE_KEY = "pfr_muted_v1"
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const videoRefs = useRef(new Map<string, HTMLVideoElement>())
  const [activeIndex, setActiveIndex] = useState(() => {
    const stored = localStorage.getItem(INDEX_STORAGE_KEY)
    const parsed = stored ? Number(stored) : 0
    if (Number.isFinite(parsed) && parsed >= 0 && parsed < clips.length) {
      return parsed
    }
    return 0
  })
  const [muted, setMuted] = useState(() => {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY)
    if (stored === null) {
      return true
    }
    return stored === "true"
  })
  const { entitlement } = useEntitlement()
  const activeIndexRef = useRef(activeIndex)

  useEffect(() => {
    if (activeIndex >= clips.length) {
      setActiveIndex(0)
    }
  }, [clips])

  useEffect(() => {
    activeIndexRef.current = activeIndex
    localStorage.setItem(INDEX_STORAGE_KEY, String(activeIndex))
  }, [activeIndex])

  useEffect(() => {
    localStorage.setItem(MUTE_STORAGE_KEY, String(muted))
  }, [muted])

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      const target = itemRefs.current[nextIndex]
      if (target) {
        target.scrollIntoView({ behavior: "smooth" })
        setActiveIndex(nextIndex)
      }
    },
    [setActiveIndex],
  )

  useEffect(() => {
    const root = containerRef.current
    if (!root || clips.length === 0) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let nextIndex = activeIndexRef.current
        let maxRatio = 0
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            const index = Number((entry.target as HTMLElement).dataset.index)
            if (!Number.isNaN(index)) {
              maxRatio = entry.intersectionRatio
              nextIndex = index
            }
          }
        })
        if (nextIndex !== activeIndexRef.current) {
          setActiveIndex(nextIndex)
        }
      },
      { root, threshold: [0.4, 0.6, 0.8] },
    )

    itemRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [clips, setActiveIndex])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        scrollToIndex(Math.min(activeIndexRef.current + 1, clips.length - 1))
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        scrollToIndex(Math.max(activeIndexRef.current - 1, 0))
      }
      if (event.key === " ") {
        event.preventDefault()
        const clip = clips[activeIndexRef.current]
        if (!clip) {
          return
        }
        const video = videoRefs.current.get(clip.id)
        if (video) {
          if (video.paused) {
            void video.play()
          } else {
            video.pause()
          }
        }
      }
      if (event.key.toLowerCase() === "m") {
        event.preventDefault()
        setMuted((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [clips, scrollToIndex])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const target = itemRefs.current[activeIndexRef.current]
      if (target) {
        target.scrollIntoView()
      }
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const NAV_HEIGHT = 64

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="snap-y snap-mandatory overflow-y-auto"
        style={{ height: `calc(100vh - ${NAV_HEIGHT}px)` }}
      >
        {clips.map((clip, index) => {
          const isLocked = clip.isPremium && entitlement === "FREE"
          const shouldRenderVideo = activeIndex === index && !isLocked
          return (
            <div
              key={clip.id}
              data-index={index}
              ref={(element) => {
                itemRefs.current[index] = element
              }}
            >
              <ShortsItem
                clip={clip}
                isActive={activeIndex === index}
                muted={muted}
                onToggleMute={() => setMuted((prev) => !prev)}
                videoRef={(node) => {
                  if (node) {
                    videoRefs.current.set(clip.id, node)
                  } else {
                    videoRefs.current.delete(clip.id)
                  }
                }}
                shouldRenderVideo={shouldRenderVideo}
                isLocked={isLocked}
                onPrev={index > 0 ? () => scrollToIndex(index - 1) : undefined}
                onNext={index < clips.length - 1 ? () => scrollToIndex(index + 1) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ShortsFeed
