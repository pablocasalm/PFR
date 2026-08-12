import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Play } from "lucide-react"
import { resetPassword } from "../api/auth"

/**
 * Página de "nueva contraseña" (/reset-password?token=...). Pública: se llega desde el enlace
 * del email de recuperación. Valida el token en el backend y fija la contraseña nueva.
 */
const ResetPasswordPage = () => {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo restablecer la contraseña.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight bg-film-room p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
            <Play className="h-5 w-5" fill="currentColor" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold uppercase tracking-wide text-white">Padel</p>
            <p className="text-sm font-bold uppercase tracking-wide text-white">Film Room</p>
          </div>
        </div>

        {!token ? (
          <>
            <h1 className="font-display text-2xl font-bold text-white">Enlace no válido</h1>
            <p className="mt-2 text-sm text-white/60">Falta el token de recuperación. Solicita un enlace nuevo desde la pantalla de acceso.</p>
            <Link to="/login" className="mt-6 inline-block font-semibold text-neon-cyan hover:underline">Volver a iniciar sesión</Link>
          </>
        ) : done ? (
          <>
            <h1 className="font-display text-2xl font-bold text-white">Contraseña actualizada</h1>
            <p className="mt-2 text-sm text-white/60">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
            >
              Iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-white">Nueva contraseña</h1>
            <p className="mt-1.5 text-sm text-white/60">Elige una contraseña nueva para tu cuenta.</p>

            <form onSubmit={submit} className="mt-7 space-y-3">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className={inputCls}
                autoComplete="new-password"
              />
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className={inputCls}
                autoComplete="new-password"
              />

              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Un momento..." : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
