import { useState, type RefObject } from "react"
import { motion } from "framer-motion"
import DecisionFrame from "./DecisionFrame"
import DecisionToggle, { type DecisionMode } from "./DecisionToggle"
import EmailCapture from "./EmailCapture"
import { fadeUp, staggerContainer, usePrefersReducedMotion } from "./motion"

type HeroProps = {
  onOpenPreview: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

const Hero = ({ onOpenPreview, inputRef }: HeroProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const [mode, setMode] = useState<DecisionMode>("decision")

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 hero-surface" />
      <div className="absolute inset-0 noise-layer opacity-30" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-32 md:pb-28 md:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            variants={staggerContainer(reduceMotion, 0.08)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6"
          >
            <motion.p
              variants={fadeUp(reduceMotion)}
              className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60"
            >
              Padel Film Room
            </motion.p>
            <motion.h1
              variants={fadeUp(reduceMotion)}
              className="font-display text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
            >
              Deja de copiar golpes.{" "}
              <span className="bg-gradient-to-r from-neon-cyan to-neon-lime bg-clip-text text-transparent">
                Empieza a copiar decisiones.
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp(reduceMotion)}
              className="max-w-xl text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Análisis táctico de pádel profesional: decisiones correctas bajo presión, el porqué
              de cada punto y los patrones que se repiten.
            </motion.p>
            <motion.div variants={fadeUp(reduceMotion)} className="pt-2">
              <EmailCapture
                inputId="waitlist-hero-email"
                inputRef={inputRef}
                buttonLabel="Únete a la lista privada"
                microcopy="Acceso anticipado + ejemplos de análisis. Cero spam. Puedes salir cuando quieras."
              />
            </motion.div>
            <motion.div variants={fadeUp(reduceMotion)} className="flex items-center gap-4">
              <button
                type="button"
                onClick={onOpenPreview}
                className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
              >
                Ver un ejemplo
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeUp(reduceMotion)}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4"
          >
            <DecisionToggle value={mode} onChange={setMode} />
            <DecisionFrame mode={mode} />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
