import { Globe2 } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"

/** Insignia "EN" para miniaturas con vídeo doblado al inglés (HeyGen) disponible. */
const EnglishBadge = ({ className = "top-2 left-2" }: { className?: string }) => {
  const { t } = useI18n()
  return (
    <span
      aria-label={t("english-badge.label", "Disponible en inglés")}
      title={t("english-badge.label", "Disponible en inglés")}
      className={`absolute ${className} flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neon-cyan`}
    >
      <Globe2 className="h-3 w-3" /> EN
    </span>
  )
}

export default EnglishBadge
