import { useEffect } from "react"
import { X } from "lucide-react"

/**
 * Hoja inferior (bottom sheet) para móvil (§9.8/§10.6). Se superpone sin sacar al
 * usuario de la página: al cerrarla vuelve exactamente donde estaba (el vídeo sigue).
 * Solo se usa en móvil (lg:hidden); en escritorio el contenido se muestra en línea.
 * Bloquea el scroll del fondo mientras está abierta y cierra con backdrop o Escape.
 */
export const BottomSheet = ({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-white/10 bg-midnight motion-safe:animate-[sheet-up_.22s_ease-out]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-white/60 transition hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
      {/* Animación de entrada (respeta prefers-reduced-motion vía motion-safe) */}
      <style>{`@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  )
}
