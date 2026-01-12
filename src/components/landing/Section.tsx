import type { ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "../../lib/utils"

type SectionProps = {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  description?: string
  align?: "left" | "center"
  className?: string
  children?: ReactNode
}

const Section = ({
  id,
  eyebrow,
  title,
  subtitle,
  description,
  align = "left",
  className,
  children,
}: SectionProps) => {
  const reduceMotion = useReducedMotion()

  return (
    <section id={id} className={cn("relative w-full", className)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-20 md:py-28">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("flex flex-col gap-4", align === "center" && "items-center text-center")}
        >
          {eyebrow && (
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              {eyebrow}
            </span>
          )}
          <h2 className="font-display text-balance text-3xl font-semibold text-white md:text-4xl">
            {title}
          </h2>
          {subtitle && <p className="text-lg text-white/70 md:text-xl">{subtitle}</p>}
          {description && (
            <p className="max-w-3xl text-base text-white/60 md:text-lg">{description}</p>
          )}
        </motion.div>
        {children}
      </div>
    </section>
  )
}

export default Section
