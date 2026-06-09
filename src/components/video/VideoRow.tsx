import { useEffect, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import HorizontalScrollRow from "../ui/HorizontalScrollRow"
import VideoCard from "./VideoCard"

type VideoRowProps = {
  clips: Clip[]
  cardTarget?: "clip" | "video"
  className?: string
}

const VideoRow = ({ clips, cardTarget = "clip", className = "" }: VideoRowProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateEdges = () => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    setShowLeft(scrollLeft > 0)
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1)
  }

  useEffect(() => {
    updateEdges()
  }, [clips])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const onScroll = () => updateEdges()
    el.addEventListener("scroll", onScroll, { passive: true })
    const observer = new ResizeObserver(() => updateEdges())
    observer.observe(el)
    window.addEventListener("resize", updateEdges)
    return () => {
      el.removeEventListener("scroll", onScroll)
      observer.disconnect()
      window.removeEventListener("resize", updateEdges)
    }
  }, [])

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const amount = el.clientWidth * 0.8
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" })
  }

  return (
    <div className={`relative mt-8 w-full max-w-full overflow-hidden ${className}`}>
      {showLeft && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-midnight to-transparent" />
      )}
      {showRight && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-midnight to-transparent" />
      )}
      {showLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          className="focus-ring absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 opacity-0 transition hover:text-white group-hover:opacity-100 md:flex"
          aria-label="Desplazar a la izquierda"
        >
          ‹
        </button>
      )}
      {showRight && (
        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          className="focus-ring absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white/70 opacity-0 transition hover:text-white group-hover:opacity-100 md:flex"
          aria-label="Desplazar a la derecha"
        >
          ›
        </button>
      )}
      <HorizontalScrollRow
        ref={scrollRef}
        className="w-full max-w-full flex-nowrap overflow-y-hidden px-4"
        itemClassName="w-[220px]"
      >
        {clips.map((clip, index) => (
          <VideoCard key={`${clip.id}-${index}`} clip={clip} target={cardTarget} />
        ))}
      </HorizontalScrollRow>
    </div>
  )
}

export default VideoRow
