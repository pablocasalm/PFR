import { useState } from "react"
import { useI18n } from "../../../../lib/i18n/store"
import { adminDeleteUser } from "../../../../lib/api/profile"

/**
 * Borrar una cuenta por su email (Panel → Invitaciones, al final): para las peticiones de borrado
 * que llegan a hello@, también de cuentas creadas sin código. Mismo borrado que el del usuario
 * (AccountDeletionService). Pide escribir el email y confirmar.
 */
const AdminDeleteAccount = () => {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async () => {
    const target = email.trim()
    if (!target || busy) return
    if (!window.confirm(t("admin-delete-account.confirm", "Se borrará la cuenta de {email} y todos sus datos, y se cancelará su suscripción. No se puede deshacer. ¿Seguir?", { email: target }))) return
    setBusy(true)
    setMessage(null)
    try {
      await adminDeleteUser(target)
      setMessage({ ok: true, text: t("admin-delete-account.done", "Cuenta de {email} borrada.", { email: target }) })
      setEmail("")
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-delete-account.error", "No se pudo borrar la cuenta.") })
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="mt-12 max-w-xl rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm">
      <summary className="cursor-pointer text-white/60">{t("admin-delete-account.title", "Eliminar una cuenta")}</summary>
      <p className="mt-3 text-xs leading-relaxed text-white/45">
        {t("admin-delete-account.help", "Para peticiones de borrado. Cancela su suscripción, borra sus datos y libera su email.")}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("admin-delete-account.placeholder", "email@ejemplo.com")}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          onClick={run}
          disabled={!email.trim() || busy}
          className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {busy ? t("admin-delete-account.busy", "Eliminando…") : t("admin-delete-account.cta", "Eliminar cuenta")}
        </button>
      </div>
      {message && <p className={`mt-2 text-xs ${message.ok ? "text-neon-cyan" : "text-red-300"}`}>{message.text}</p>}
    </details>
  )
}

export default AdminDeleteAccount
