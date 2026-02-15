import type { KeyboardEvent } from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { durations, easings, usePrefersReducedMotion } from "./motion"

type DecisionMode = "shot" | "decision"

type DecisionToggleProps = {
  value: DecisionMode
  onChange: (value: DecisionMode) => void
  className?: string
}

const options: Array<{ label: string; value: DecisionMode; mono: string }> = [
  { label: "Golpe", value: "shot", mono: "SHOT" },
  { label: "Decisión", value: "decision", mono: "DECISION" },
]

const DecisionToggle = ({ value, onChange, className }: DecisionToggleProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const activeIndex = options.findIndex((option) => option.value === value)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const nextIndex =
      event.key === "ArrowRight"
        ? (activeIndex + 1) % options.length
        : (activeIndex - 1 + options.length) % options.length
    onChange(options[nextIndex].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Selector de enfoque"
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex items-center rounded-full border border-white/10 bg-[#0a0f18] p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        className
      )}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full border border-white/40 bg-gradient-to-b from-white/90 to-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
        animate={{ x: activeIndex === 0 ? 0 : "100%" }}
        transition={{
          duration: reduceMotion ? 0 : durations.micro,
          ease: easings.out,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-10 flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight",
            value === option.value ? "text-midnight" : "text-white/70"
          )}
        >
          <span className="text-[9px] font-mono tracking-[0.28em] text-white/70">
            {option.mono}
          </span>
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export type { DecisionMode }
export default DecisionToggle
