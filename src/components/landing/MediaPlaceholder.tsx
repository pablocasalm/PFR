import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { fadeUp, usePrefersReducedMotion } from "./motion"

type MediaPlaceholderProps = {
  className?: string
}

const MediaPlaceholder = ({ className }: MediaPlaceholderProps) => {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <motion.div
      variants={fadeUp(reduceMotion)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.4)]",
        className
      )}
      aria-label="Espacio para teaser"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_1px,transparent_1px,transparent_5px)]" />
      </div>
      <div className="relative grid gap-4 md:grid-cols-3">
        {["PATTERN BOARD", "DECISION MAP", "TACTIC FLOW"].map((label) => (
          <div
            key={label}
            className="relative flex min-h-[140px] flex-col justify-between rounded-2xl border border-white/10 bg-[#070b12] p-4"
          >
            <div className="absolute -left-2 top-4 h-6 w-1 rounded-full bg-white/15" />
            <div className="absolute -right-2 top-4 h-6 w-1 rounded-full bg-white/15" />
            <div className="h-16 w-full rounded-xl border border-dashed border-white/20 bg-black/30" />
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/60">{label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default MediaPlaceholder
