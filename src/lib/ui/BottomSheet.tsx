import { useEffect } from "react"
import { X } from "lucide-react"
import { useI18n } from "../i18n/store"

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
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    // El propio componente se sigue montando (aunque oculto vía `lg:hidden`) cuando `open` es
    // true en pantallas de escritorio, donde el contenido se muestra en línea, no como hoja
    // superpuesta — sin este chequeo, se bloqueaba el scroll de la página igualmente aunque no
    // hubiera ningún overlay visible tapando nada (§reporte de beta).
    const isOverlayVisible = !window.matchMedia("(min-width: 1024px)").matches
    const prevOverflow = document.body.style.overflow
    if (isOverlayVisible) document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      if (isOverlayVisible) document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* El fondo se alarga por arriba y por abajo más allá de la pantalla visible: en Safari de
          iPhone la página se ve también bajo la barra de estado y la barra de direcciones, y un
          fondo de `inset-0` dejaba ahí una franja sin oscurecer ni difuminar (§reporte de beta #85). */}
      <div className="absolute inset-x-0 -inset-y-32 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* `dvh` (viewport visible), no `vh`: en Safari de iPhone 85vh se calcula sobre la pantalla
          SIN las barras del navegador, y con ellas a la vista la hoja quedaba más alta que el
          hueco real — la cabecera con el botón de cerrar se salía por arriba (§reporte de beta).
          El `max-h-[85vh]` de antes queda de respaldo para navegadores sin `dvh`. */}
      <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] max-h-[85dvh] flex-col rounded-t-2xl border-t border-white/10 bg-midnight motion-safe:animate-[sheet-up_.22s_ease-out]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label={t("common.close", "Cerrar")} className="text-white/60 transition hover:text-white">
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
