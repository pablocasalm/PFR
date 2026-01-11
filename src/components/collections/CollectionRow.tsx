import { useEffect, useRef, useState } from "react"
import type { Clip } from "../../types/clip"
import CollectionCard from "./CollectionCard"

type CollectionRowProps = {
  title: string
  description?: string
  clips: Clip[]
}

const CollectionRow = ({ title, description, clips }: CollectionRowProps) => {
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

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault()
      el.scrollLeft += event.deltaY
    }
  }

  return (
    <section className="group space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
            ▦ Colección
          </span>
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            {clips.length} clips
          </span>
        </div>
        {description && <p className="text-sm text-white/60">{description}</p>}
      </div>
      <div className="relative w-full max-w-full overflow-hidden">
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
          onWheel={handleWheel}
          className="flex w-full max-w-full flex-nowrap snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden px-4 pb-4 scrollbar-hide"
          style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
        >
          {clips.map((clip, index) => (
            <div
              key={`${clip.id}-${index}`}
              className="flex-none w-[70vw] snap-start sm:w-[280px] md:w-[300px] lg:w-[320px] xl:w-[340px]"
            >
              <CollectionCard clip={clip} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CollectionRow
