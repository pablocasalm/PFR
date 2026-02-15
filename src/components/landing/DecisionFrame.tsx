import { AnimatePresence, motion } from "framer-motion"
import { cn } from "../../lib/utils"
import { blurIn, usePrefersReducedMotion } from "./motion"
import type { DecisionMode } from "./DecisionToggle"

type DecisionFrameProps = {
  mode: DecisionMode
  className?: string
}

const shotContent = {
  title: "Bandeja al cuerpo",
  bullets: [
    "Impacto a la altura del pecho",
    "Objetivo: zona media para fijar",
    "Ritmo estable sin lectura contextual",
  ],
}

const decisionContent = {
  title: "Lectura táctica en cadena",
  rows: [
    { label: "CTX", value: "Rival cerrando el centro, globo corto" },
    { label: "CUE", value: "Entrada tarde y pies cruzados" },
    { label: "CHOICE", value: "Salida de pared cruzada con altura" },
    { label: "OUTCOME", value: "Apertura de carril + bola de ataque" },
  ],
  bullets: [
    "Decisión guiada por señales reales",
    "Contexto primero, ejecución después",
  ],
}

const DecisionFrame = ({ mode, className }: DecisionFrameProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const isDecision = mode === "decision"
  const content = isDecision ? decisionContent : shotContent

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/10 bg-[#070b12] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_30px_70px_rgba(0,0,0,0.45)]",
        "before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_30%)]",
        "after:absolute after:inset-0 after:bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.03)_1px,transparent_1px)] after:bg-[length:28px_28px] after:opacity-30",
        className
      )}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_1px,transparent_1px,transparent_5px)]" />
      </div>
      <span className="pointer-events-none absolute left-4 top-4 h-3 w-3 border-l border-t border-white/40" />
      <span className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r border-t border-white/40" />
      <span className="pointer-events-none absolute left-4 bottom-4 h-3 w-3 border-b border-l border-white/40" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 border-b border-r border-white/40" />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-[11px] uppercase tracking-[0.3em] text-white/60">
        <span className="font-mono">00:14 · salida de pared</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px]">LIVE READ</span>
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px]">PATTERN</span>
        </div>
      </div>

      <div className="relative z-10 px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={blurIn(reduceMotion)}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
                  {isDecision ? "Decision Lens" : "Shot Focus"}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">{content.title}</h3>
              </div>
              <div className="relative h-20 w-20 rounded-2xl border border-white/15 bg-[#0a101a]">
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                  <rect x="10" y="10" width="80" height="80" rx="6" fill="none" stroke="rgba(255,255,255,0.2)" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.2)" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(255,255,255,0.2)" />
                  <path d="M20 70 L60 40 L80 55" stroke="#28f0e0" strokeWidth="2" fill="none" />
                  <circle cx="60" cy="40" r="4" fill="#befc4b" />
                </svg>
              </div>
            </div>

            {isDecision ? (
              <div className="space-y-3">
                {decisionContent.rows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[80px_1fr] gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/50">
                      {row.label}
                    </span>
                    <span className="text-sm text-white/70">{row.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-white/70">
                {shotContent.bullets.map((bullet, index) => (
                  <motion.li
                    key={bullet}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0.2 : 0.45,
                      delay: reduceMotion ? 0 : index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#28f0e0]" />
                    <span>{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            )}

            {isDecision && (
              <ul className="space-y-2 text-sm text-white/70">
                {decisionContent.bullets.map((bullet, index) => (
                  <motion.li
                    key={bullet}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0.2 : 0.45,
                      delay: reduceMotion ? 0 : index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#befc4b]" />
                    <span>{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default DecisionFrame
