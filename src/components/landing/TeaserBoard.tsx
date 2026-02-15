import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import teaserScenes from "./data/teaserScenes"
import { fadeUp, usePrefersReducedMotion } from "./motion"

type TeaserBoardProps = {
  compact?: boolean
  onJoinClick?: () => void
  className?: string
}

const TeaserBoard = ({ compact = false, className }: TeaserBoardProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const scene = teaserScenes[0]

  return (
    <div className={cn("grid gap-8", compact ? "lg:grid-cols-1" : "lg:grid-cols-[1.05fr_0.95fr]", className)}>
      <motion.div variants={fadeUp(reduceMotion)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
        <div className="space-y-4">
          <h3 className="text-2xl font-semibold text-white">{scene.title}</h3>
          <p className="text-sm text-white/70">
            <span className="text-white/50">Situación:</span> {scene.situation}
          </p>
          <p className="text-sm text-white/70">
            <span className="text-white/50">Decisión:</span> {scene.decision}
          </p>
          <p className="text-sm text-white/70">
            <span className="text-white/50">Consecuencia:</span> {scene.consequence}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp(reduceMotion)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="relative overflow-hidden rounded-3xl bg-[#0a0f18] p-5"
      >
        <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
          <rect x="20" y="20" width="280" height="180" rx="12" fill="none" stroke="rgba(255,255,255,0.16)" />
          <line x1="160" y1="20" x2="160" y2="200" stroke="rgba(255,255,255,0.14)" />
          <line x1="20" y1="110" x2="300" y2="110" stroke="rgba(255,255,255,0.14)" />
          <path d="M60 170 L150 90 L240 140" stroke="#28f0e0" strokeWidth="3" fill="none" />
          <circle cx="150" cy="90" r="6" fill="#befc4b" />
        </svg>
      </motion.div>
    </div>
  )
}

export default TeaserBoard
