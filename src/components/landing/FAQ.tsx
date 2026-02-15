import { AnimatePresence, motion } from "framer-motion"
import { useState } from "react"
import { cn } from "../../lib/utils"
import { usePrefersReducedMotion } from "./motion"

const faqs = [
  {
    question: "¿Es solo para profesionales?",
    answer:
      "No. Es para jugadores que quieren mejorar su comprensión del juego, independientemente del nivel.",
  },
  {
    question: "¿Cuándo se lanza?",
    answer: "Muy pronto. La lista privada será la primera en saberlo.",
  },
  {
    question: "¿Habrá contenido gratuito?",
    answer: "Sí. Siempre habrá contenido abierto y contenido más profundo.",
  },
]

const FAQ = () => {
  const reduceMotion = usePrefersReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="grid gap-4">
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index
        const panelId = `faq-panel-${index}`
        const buttonId = `faq-button-${index}`
        return (
          <div
            key={faq.question}
            className={cn(
              "rounded-2xl border border-white/10 bg-[#0a0f18] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
              isOpen && "border-neon-cyan/40"
            )}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
            >
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/50">FAQ</p>
                <p className="mt-2 text-sm font-semibold text-white/80 md:text-base">{faq.question}</p>
              </div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  transition={{ duration: reduceMotion ? 0.2 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4 border-l-2 border-neon-cyan/50 pl-4 text-sm leading-relaxed text-white/70"
                >
                  {faq.answer}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export default FAQ
