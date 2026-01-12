import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import EmailCapture from "./EmailCapture"
import MediaPlaceholder from "./MediaPlaceholder"

const Hero = () => {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const ySlow = useTransform(scrollYProgress, [0, 1], [0, -80])
  const yFast = useTransform(scrollYProgress, [0, 1], [0, 60])

  return (
    <section ref={ref} id="top" className="relative overflow-hidden">
      <div className="absolute inset-0 hero-surface" />
      <div className="absolute inset-0 noise-layer opacity-40" aria-hidden="true" />
      {!reduceMotion && (
        <>
          <motion.div
            style={{ y: ySlow }}
            className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-[120px]"
            aria-hidden="true"
          />
          <motion.div
            style={{ y: yFast }}
            className="absolute right-0 top-10 h-64 w-64 rounded-full bg-amber-400/20 blur-[120px]"
            aria-hidden="true"
          />
        </>
      )}
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-32 md:pb-28 md:pt-40">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60"
            >
              Padel Film Room
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="font-display text-balance text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl"
            >
              Deja de copiar golpes.{" "}
              <span className="headline-sweep">Empieza a copiar decisiones.</span>
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="max-w-xl text-base text-white/70 sm:text-lg"
            >
              Analisis tactico de padel profesional. Entiende por que se gana cada punto.
            </motion.p>
            <EmailCapture
              id="waitlist"
              buttonLabel="Unete a la lista privada"
              microcopy="Acceso anticipado, contenido exclusivo y novedades. Sin spam."
            />
          </div>
          <MediaPlaceholder />
        </div>
      </div>
    </section>
  )
}

export default Hero
