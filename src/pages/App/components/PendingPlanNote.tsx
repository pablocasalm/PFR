import { CalendarClock } from "lucide-react"
import { PLAN_NAME, type AuthUser } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Aviso de que hay un cambio de suscripción pedido y todavía sin aplicar: una bajada de plan o
 * una cancelación. Ninguna de las dos quita nada al momento — lo pagado se conserva hasta el
 * final del periodo —, así que sin este aviso quien acaba de bajar de plan vería que todo sigue
 * igual y no sabría si su cambio se ha registrado. (Subir de plan sí se aplica al momento.)
 * No pinta nada si no hay ningún cambio pendiente.
 */
const PendingPlanNote = ({ user, className = "" }: { user: AuthUser | null; className?: string }) => {
  const { t, lang } = useI18n()
  if (!user?.pendingChangeAtUtc || !user.planTier) return null
  if (!user.pendingCancel && !user.pendingPlanTier) return null

  const date = new Date(user.pendingChangeAtUtc).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long", year: "numeric" })
  const current = PLAN_NAME[user.planTier]
  const text = user.pendingCancel
    ? t("plan.pending.cancel", "Has cancelado tu suscripción. Conservas {current} hasta el {date}.", { current, date })
    : t("plan.pending.downgrade", "Has cambiado a {next}. Conservas {current} hasta el {date}; ese día pasarás a {next}.", {
        current,
        next: PLAN_NAME[user.pendingPlanTier!],
        date,
      })

  return (
    <p className={`flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100 ${className}`}>
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <span>{text}</span>
    </p>
  )
}

export default PendingPlanNote
