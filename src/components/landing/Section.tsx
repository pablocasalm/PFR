import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { fadeUp, usePrefersReducedMotion } from "./motion"

type SectionProps = {
  id?: string
  chapter?: string
  eyebrow?: string
  title: string
  subtitle?: string
  description?: string
  align?: "left" | "center"
  variant?: "editorial" | "structured"
  className?: string
  children?: ReactNode
}

const Section = ({
  id,
  chapter,
  eyebrow,
  title,
  subtitle,
  description,
  align = "left",
  variant = "editorial",
  className,
  children,
}: SectionProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const isStructured = variant === "structured"

  return (
    <section id={id} className={cn("relative w-full", className)}>
      {isStructured && (
        <div className="absolute inset-0 opacity-40">
          <div className="h-full w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_60%)]" />
        </div>
      )}
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-6xl flex-col px-6",
          isStructured ? "gap-10 py-20 md:py-28" : "gap-8 py-14 md:py-18"
        )}
      >
        {isStructured && chapter && (
          <div className="relative flex items-center justify-center">
            <div className="absolute left-0 right-0 h-px bg-white/10" />
            <div className="relative z-10 flex items-center gap-3 bg-[#0b0f12] px-4 text-[10px] font-mono uppercase tracking-[0.32em] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              {chapter}
              <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            </div>
          </div>
        )}

        <motion.div
          variants={fadeUp(reduceMotion)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className={cn("flex flex-col gap-4", align === "center" && "items-center text-center")}
        >
          {eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              {eyebrow}
            </span>
          )}
          <h2 className="font-display text-balance text-3xl font-semibold text-white md:text-4xl">
            {title}
          </h2>
          {subtitle && <p className="text-base leading-relaxed text-white/70 md:text-lg">{subtitle}</p>}
          {description && (
            <p className="max-w-3xl text-base leading-relaxed text-white/60 md:text-lg">{description}</p>
          )}
        </motion.div>
        {children}
      </div>
    </section>
  )
}

export default Section
