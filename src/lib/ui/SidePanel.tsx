import { useEffect } from "react"
import { X } from "lucide-react"
import { useI18n } from "../i18n/store"

/**
 * Panel lateral que entra por la derecha sobre la pantalla actual (admin) — para editar un
 * bloque sin salir de la portada. `wide` lo lleva a pantalla completa (espacios de trabajo que
 * necesitan anchura, como el plan del mes con su catálogo de clips). Se cierra con la X, con
 * Escape o pulsando fuera; mientras está abierto, la página de detrás no hace scroll.
 */
const SidePanel = ({
  title,
  subtitle,
  wide = false,
  onClose,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  wide?: boolean
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}) => {
  const { t } = useI18n()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label={title}>
      <button className="hidden flex-1 bg-black/60 backdrop-blur-sm sm:block" onClick={onClose} aria-label={t("common.close", "Cerrar")} tabIndex={-1} />
      <div className={`flex h-full w-full flex-col border-l border-white/10 bg-midnight bg-film-room shadow-2xl ${wide ? "sm:max-w-[1400px]" : "sm:max-w-xl"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-display text-xl font-bold leading-snug text-white">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/55">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white" aria-label={t("common.close", "Cerrar")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">{children}</div>
        {footer && <div className="border-t border-white/10 px-5 py-3 sm:px-7">{footer}</div>}
      </div>
    </div>
  )
}

export default SidePanel
