import { useEffect, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import VideoCard from "./VideoCard"

type VideoRowProps = {
  clips: Clip[]
  cardTarget?: "clip" | "analysis"
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
    <div className={`relative w-full max-w-full overflow-hidden ${className}`}>
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
      <div
        ref={scrollRef}
        className="flex w-full max-w-full flex-nowrap gap-3 overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide"
        style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
      >
        {clips.map((clip, index) => (
          <div
            key={`${clip.id}-${index}`}
            className="flex-none w-[190px] sm:w-[210px] md:w-[230px] lg:w-[250px] xl:w-[270px]"
          >
            <VideoCard clip={clip} target={cardTarget} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default VideoRow
