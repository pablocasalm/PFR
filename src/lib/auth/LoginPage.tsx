import { useState } from "react"
import { Navigate, useNavigate, useSearchParams } from "react-router-dom"
import { Play } from "lucide-react"
import { useAuth } from "./store"
import { requestInvite } from "../api/invites"
import { requestPasswordReset } from "../api/auth"

/**
 * Pantalla de acceso (login / registro / solicitar código / recuperar contraseña). Es la puerta
 * de toda la app. Durante la beta, el registro exige un código de invitación (llega por URL,
 * ?invite=&email=). Si el código está gastado se puede solicitar otro; y hay recuperación de
 * contraseña por email.
 */

type Mode = "login" | "register" | "request" | "forgot"

const LoginPage = () => {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const inviteFromUrl = params.get("invite") ?? ""
  const emailFromUrl = params.get("email") ?? ""

  const [mode, setMode] = useState<Mode>(inviteFromUrl ? "register" : "login")
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [inviteCode, setInviteCode] = useState(inviteFromUrl)
  const [emailOnly, setEmailOnly] = useState(emailFromUrl) // email para "solicitar código" / "recuperar"
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/app/inicio" replace />

  const isEmailOnly = mode === "request" || mode === "forgot"

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
    setPassword("")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === "login") {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password, displayName.trim() || undefined, inviteCode.trim())
      }
      navigate("/app/inicio", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación.")
    } finally {
      setLoading(false)
    }
  }

  const submitEmailOnly = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === "request") {
        const res = await requestInvite(emailOnly.trim())
        setInfo(res.message ?? "Solicitud recibida. Te enviaremos un nuevo código pronto.")
      } else {
        await requestPasswordReset(emailOnly.trim())
        setInfo("Si el email existe, te hemos enviado un enlace para restablecer tu contraseña.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud.")
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"

  const title =
    mode === "login" ? "Inicia sesión"
    : mode === "register" ? "Crea tu cuenta"
    : mode === "request" ? "Solicitar un código"
    : "Recuperar contraseña"
  const subtitle =
    mode === "login" ? "Accede a tu biblioteca táctica de Padel Film Room."
    : mode === "register" ? "Introduce tu código de invitación para unirte a la beta."
    : mode === "request" ? "¿Tu código ya se ha usado? Pide uno nuevo con tu email."
    : "Te enviaremos un enlace para crear una contraseña nueva."

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

        <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
        <p className="mt-1.5 text-sm text-white/60">{subtitle}</p>

        {isEmailOnly ? (
          <form onSubmit={submitEmailOnly} className="mt-7 space-y-3">
            <input
              type="email"
              required
              value={emailOnly}
              onChange={(e) => setEmailOnly(e.target.value)}
              placeholder="Tu email"
              className={inputCls}
              autoComplete="email"
            />
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
            {info && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Un momento..." : mode === "request" ? "Solicitar código" : "Enviar enlace"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-3">
            {mode === "register" && (
              <>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className={inputCls}
                  autoComplete="name"
                />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Código de invitación"
                  className={inputCls}
                  autoCapitalize="characters"
                />
              </>
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

            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="w-full text-center text-xs text-white/50 transition hover:text-white"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {mode === "register" && (
              <button
                type="button"
                onClick={() => switchMode("request")}
                className="w-full text-center text-xs text-white/50 transition hover:text-white"
              >
                ¿Tu código no funciona? Solicita otro
              </button>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/60">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button onClick={() => switchMode("register")} className="font-semibold text-neon-cyan hover:underline">
                Regístrate
              </button>
            </>
          ) : mode === "register" ? (
            <>
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => switchMode("login")} className="font-semibold text-neon-cyan hover:underline">
                Inicia sesión
              </button>
            </>
          ) : (
            <button onClick={() => switchMode("login")} className="font-semibold text-neon-cyan hover:underline">
              Volver a iniciar sesión
            </button>
          )}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
