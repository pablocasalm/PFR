import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { cn } from "../../lib/utils"
import useLockBodyScroll from "./useLockBodyScroll"
import { durations, easings, usePrefersReducedMotion } from "./motion"

type PreviewModalProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

const PreviewModal = ({ open, onClose, title, children }: PreviewModalProps) => {
  const reduceMotion = usePrefersReducedMotion()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const lastActiveRef = useRef<HTMLElement | null>(null)

  useLockBodyScroll(open)

  useEffect(() => {
    if (!open) return
    lastActiveRef.current = document.activeElement as HTMLElement | null
    setTimeout(() => closeRef.current?.focus(), 0)
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
      if (event.key !== "Tab") return
      const container = dialogRef.current
      if (!container) return
      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("keydown", handleKey)
      lastActiveRef.current?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : durations.reveal, ease: easings.out }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-0 opacity-20">
            <div className="h-full w-full bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.06),rgba(255,255,255,0.06)_1px,transparent_1px,transparent_5px)]" />
          </div>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
            ref={dialogRef}
            className={cn(
              "relative z-10 w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[#060a10] shadow-[0_30px_80px_rgba(0,0,0,0.6)]",
              "before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_30%)]"
            )}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.4, ease: easings.out }}
          >
            <span className="pointer-events-none absolute left-4 top-4 h-3 w-3 border-l border-t border-white/40" />
            <span className="pointer-events-none absolute right-4 top-4 h-3 w-3 border-r border-t border-white/40" />
            <span className="pointer-events-none absolute left-4 bottom-4 h-3 w-3 border-b border-l border-white/40" />
            <span className="pointer-events-none absolute bottom-4 right-4 h-3 w-3 border-b border-r border-white/40" />

            <div className="relative z-10 flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 id="preview-title" className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                {title}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-midnight"
                aria-label="Cerrar preview"
              >
                ×
              </button>
            </div>
            <div className="relative z-10 px-6 py-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PreviewModal
