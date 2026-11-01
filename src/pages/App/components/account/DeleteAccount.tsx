import { useState } from "react"
import { useI18n } from "../../../../lib/i18n/store"
import { useAuth } from "../../../../lib/auth/store"
import { deleteMyAccount } from "../../../../lib/api/profile"
import { ApiError } from "../../../../lib/api/client"

/**
 * Borrar la cuenta, al final de Mi Cuenta → Seguridad (01/11/2026). A propósito discreto (pedido
 * así): un enlace pequeño que despliega la explicación, la contraseña y el botón. Ver
 * AccountDeletionService: cancela la suscripción y borra los datos; no se puede deshacer.
 */
const DeleteAccount = () => {
  const { t } = useI18n()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmDelete = async () => {
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount(password)
      logout()
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "wrong_password"
          ? t("mi-cuenta.delete.wrong-password", "La contraseña no es correcta.")
          : t("mi-cuenta.delete.error", "No se pudo borrar la cuenta. Escríbenos a hello@padelfilmroom.com."),
      )
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-6 min-h-11 text-xs text-white/35 underline-offset-4 transition hover:text-white/60 hover:underline">
        {t("mi-cuenta.delete.link", "Eliminar mi cuenta")}
      </button>
    )
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
      <p className="font-semibold text-white">{t("mi-cuenta.delete.title", "Eliminar mi cuenta")}</p>
      <p className="mt-2 leading-relaxed text-white/60">
        {t(
          "mi-cuenta.delete.text",
          "Se borran tu cuenta y tus datos: Mi Lista, tu historial, Mi Juego y tus análisis de Coach. Si tienes una suscripción, se cancela ahora y no se devuelve lo ya pagado. No se puede deshacer.",
        )}
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("mi-cuenta.delete.password", "Tu contraseña")}
        autoComplete="current-password"
        className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-red-400/50 focus:outline-none sm:text-sm"
      />
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={confirmDelete}
          disabled={!password || busy}
          className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? t("mi-cuenta.delete.busy", "Eliminando…") : t("mi-cuenta.delete.confirm", "Eliminar definitivamente")}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setPassword("")
            setError(null)
          }}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          {t("mi-cuenta.delete.cancel", "Cancelar")}
        </button>
      </div>
    </div>
  )
}

export default DeleteAccount
