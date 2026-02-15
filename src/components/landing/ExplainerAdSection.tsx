import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import MediaPlaceholder from "./MediaPlaceholder"
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "./motion"

type ExplainerAdSectionProps = {
  onOpenPreview: () => void
  className?: string
}

const ExplainerAdSection = ({ onOpenPreview, className }: ExplainerAdSectionProps) => {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <section className={cn("section-divider bg-[#0b0f12]", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-20 md:py-24">
        <motion.div
          variants={staggerContainer(reduceMotion, 0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]"
        >
          <motion.div variants={fadeUp(reduceMotion)}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f18]">
              <MediaPlaceholder />
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.28em] text-white/70">
                EXPLAINER • 00:37
              </div>
              <button
                type="button"
                onClick={onOpenPreview}
                className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-lg text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
                aria-label="Reproducir ejemplo de análisis"
              >
                ▶
              </button>
            </div>
          </motion.div>
          <motion.div variants={fadeUp(reduceMotion)} className="space-y-5 lg:pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
              Film Room explicado
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-white md:text-4xl">
              Mira cómo se analiza un punto como en un staff profesional.
            </h2>
            <p className="text-sm text-white/60 md:text-base">
              Lectura táctica en pocos segundos, sin ruido.
            </p>
            <div className="space-y-2 text-sm text-white/70">
              <p>Qué información importa</p>
              <p>La señal que cambia tu decisión</p>
              <p>La consecuencia del punto</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default ExplainerAdSection
