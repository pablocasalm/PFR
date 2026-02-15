import { motion } from "framer-motion"
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "./motion"

const items = [
  "PATTERN BOARD",
  "DECISION MAP",
  "SHOT OPTIONS",
  "RISK MATRIX",
  "MATCH FLOW",
  "KEY SIGNALS",
]

const ImageGridPlaceholders = () => {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <motion.div
      variants={staggerContainer(reduceMotion, 0.06)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((item) => (
        <motion.div
          key={item}
          variants={fadeUp(reduceMotion)}
          className="relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] p-5"
        >
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.03),rgba(255,255,255,0.03)_1px,transparent_1px,transparent_6px)]" />
          </div>
          <div className="relative flex flex-col gap-4">
            <div className="h-24 w-full rounded-xl border border-dashed border-white/20 bg-black/30" />
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/60">{item}</p>
          </div>
          <div className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-white/30" />
          <div className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-white/30" />
          <div className="pointer-events-none absolute left-3 bottom-3 h-3 w-3 border-b border-l border-white/30" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-white/30" />
        </motion.div>
      ))}
    </motion.div>
  )
}

export default ImageGridPlaceholders
