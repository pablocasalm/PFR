import { useI18n } from "../i18n/store"

/** Interruptor «Ocultar vistos» (fuera del panel de Filtros): Explorar y Resultados. */
const HideWatchedToggle = ({ checked, onChange, className = "" }: { checked: boolean; onChange: (value: boolean) => void; className?: string }) => {
  const { t } = useI18n()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2.5 text-sm text-white/80 transition hover:text-white ${className}`}
    >
      {t("watched.hide", "Ocultar vistos")}
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-neon-cyan" : "bg-white/15"}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </button>
  )
}

export default HideWatchedToggle
