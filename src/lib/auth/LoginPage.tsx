import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { Play } from "lucide-react"
import { useAuth } from "./store"

/**
 * Pantalla de acceso (login / registro). Es la puerta de toda la app: app.padelfilmroom
 * vive entera detrás de sesión, así que esto se ve ANTES de entrar a /app. Si ya hay
 * sesión, se redirige directamente al interior.
 */

type Mode = "login" | "register"

const LoginPage = () => {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Ya autenticado → no tiene sentido ver el login.
  if (isAuthenticated) return <Navigate to="/app/inicio" replace />

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setPassword("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === "login") await login(email.trim(), password)
      else await register(email.trim(), password, displayName.trim() || undefined)
      navigate("/app/inicio", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación.")
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight bg-film-room p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
        {/* Logo */}
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
            <Play className="h-5 w-5" fill="currentColor" />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold uppercase tracking-wide text-white">Padel</p>
            <p className="text-sm font-bold uppercase tracking-wide text-white">Film Room</p>
          </div>
        </div>

        <h1 className="font-display text-3xl font-bold text-white">
          {mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className="mt-1.5 text-sm text-white/60">
          {mode === "login"
            ? "Accede a tu biblioteca táctica de Padel Film Room."
            : "Empieza a guardar clips y a seguir tu aprendizaje."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          {mode === "register" && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nombre (opcional)"
              className={inputCls}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={inputCls}
            autoComplete="email"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={inputCls}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Un momento..." : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button onClick={() => switchMode("register")} className="font-semibold text-neon-cyan hover:underline">
                Regístrate
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => switchMode("login")} className="font-semibold text-neon-cyan hover:underline">
                Inicia sesión
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
