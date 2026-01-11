import { useEffect, useMemo, useRef, useState } from "react"
import type { Tag } from "../../types/tag"

type TagChipsBarProps = {
  tags: Tag[]
  selected: string[]
  onToggle: (slug: string) => void
  onReset: () => void
}

const TagChipsBar = ({ tags, selected, onToggle, onReset }: TagChipsBarProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const hasSelected = selected.length > 0

  const sortedTags = useMemo(() => tags, [tags])

  const updateFades = () => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = scrollWidth - clientWidth
    setShowLeftFade(scrollLeft > 0)
    setShowRightFade(scrollLeft < maxScroll - 1)
  }

  useEffect(() => {
    updateFades()
  }, [tags])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    updateFades()
    const handleScroll = () => updateFades()
    el.addEventListener("scroll", handleScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => updateFades())
    resizeObserver.observe(el)
    window.addEventListener("resize", updateFades)

    return () => {
      el.removeEventListener("scroll", handleScroll)
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateFades)
    }
  }, [])

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

  const scrollByAmount = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="relative overflow-hidden">
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-midnight to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-midnight to-transparent" />
      )}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex gap-2 overflow-x-auto overflow-y-hidden px-2 pb-2 pt-1 scrollbar-hide"
        style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
      >
        <button
          type="button"
          onClick={onReset}
          className={`focus-ring shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
            !hasSelected
              ? "border-white/20 bg-white text-midnight"
              : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
          aria-pressed={!hasSelected}
        >
          Todo
        </button>
        {sortedTags.map((tag) => {
          const isActive = selected.includes(tag.slug)
          return (
            <button
              key={tag.slug}
              type="button"
              onClick={() => onToggle(tag.slug)}
              className={`focus-ring shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
                isActive
                  ? "border-neon-cyan/40 bg-neon-cyan text-midnight"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
              aria-pressed={isActive}
            >
              {tag.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TagChipsBar
