import { motion, useReducedMotion } from "framer-motion"

const items = [
  { title: "Diagrama", accent: "from-emerald-400/30 to-transparent" },
  { title: "Patrones", accent: "from-amber-400/30 to-transparent" },
  { title: "Decisiones", accent: "from-sky-400/30 to-transparent" },
]

const ImageGridPlaceholders = () => {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="grid gap-6 md:grid-cols-3"
    >
      {items.map((item) => (
        <div
          key={item.title}
          className="relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="absolute inset-0 opacity-70">
            <div className={`h-full w-full bg-gradient-to-br ${item.accent}`} />
          </div>
          <div className="relative flex h-full flex-col justify-between">
            <div className="h-28 w-full rounded-xl border border-dashed border-white/20 bg-white/5" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
              {item.title}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

export default ImageGridPlaceholders
