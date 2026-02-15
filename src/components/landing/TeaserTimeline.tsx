import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { durations, easings, usePrefersReducedMotion } from "./motion"

type TeaserTimelineProps = {
  labels: string[]
  activeIndex: number
  onSelect: (index: number) => void
  className?: string
}

const TeaserTimeline = ({ labels, activeIndex, onSelect, className }: TeaserTimelineProps) => {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <div className={cn("relative flex items-center gap-6", className)}>
      <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-white/10" />
      <div className="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 justify-between">
        {labels.map((label) => (
          <span key={label} className="h-2 w-px bg-white/15" />
        ))}
      </div>
      <motion.div
        aria-hidden="true"
        className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-neon-cyan shadow-[0_0_12px_rgba(40,240,224,0.6)]"
        style={{ left: "0.5rem" }}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={{ duration: reduceMotion ? 0 : durations.micro, ease: easings.out }}
      />
      {labels.map((label, index) => (
        <button
          key={label}
          type="button"
          aria-current={activeIndex == index ? "step" : undefined}
          onClick={() => onSelect(index)}
          className={cn(
            "relative z-10 flex flex-1 items-center gap-3 text-left text-[11px] uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight",
            activeIndex == index ? "text-white" : "text-white/60 hover:text-white"
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-mono",
              activeIndex == index
                ? "border-neon-cyan/70 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/15 bg-white/5 text-white/60"
            )}
          >
            {index + 1}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

export default TeaserTimeline
