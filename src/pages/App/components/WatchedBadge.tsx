import { Check } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"

/** Insignia de "Visto" para la esquina inferior-izquierda de una miniatura (§ estilo YouTube). */
const WatchedBadge = () => {
  const { t } = useI18n()
  return (
    <span
      aria-label={t("watched-badge.label", "Visto")}
      title={t("watched-badge.label", "Visto")}
      className="absolute bottom-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-neon-lime/90 text-midnight shadow"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  )
}

export default WatchedBadge
