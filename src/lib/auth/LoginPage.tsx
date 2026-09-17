import { useEffect, useState } from "react"
import { Navigate, useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { useAuth } from "./store"
import { requestInvite } from "../api/invites"
import { requestPasswordReset } from "../api/auth"
import { useI18n, setLanguage } from "../i18n/store"

/**
 * Pantalla de acceso (login / registro / solicitar código / recuperar contraseña). Es la puerta
 * de toda la app. Durante la beta, el registro exige un código de invitación (llega por URL,
 * ?invite=&email=). Si el código está gastado se puede solicitar otro; y hay recuperación de
 * contraseña por email.
 */

type Mode = "login" | "register" | "request" | "forgot"

const LoginPage = () => {
  const { t } = useI18n()
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const inviteFromUrl = params.get("invite") ?? ""
  const emailFromUrl = params.get("email") ?? ""
  const isRegisterPath = location.pathname === "/register"

  const [mode, setMode] = useState<Mode>(inviteFromUrl || isRegisterPath ? "register" : "login")
  const [email, setEmail] = useState(emailFromUrl)
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [inviteCode, setInviteCode] = useState(inviteFromUrl)
  const [emailOnly, setEmailOnly] = useState(emailFromUrl) // email para "solicitar código" / "recuperar"
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // El link de invitación lleva "lang" (§ idiomas preferidos): antes incluso de tener cuenta,
  // la pantalla de registro arranca ya en el idioma en que se invitó a esta persona.
  useEffect(() => {
    const langFromUrl = params.get("lang")
    if (langFromUrl === "es" || langFromUrl === "en") setLanguage(langFromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      setError(err instanceof Error ? err.message : t("login.error.generic", "No se pudo completar la operación."))
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
        setInfo(res.message ?? t("login.request.sent", "Solicitud recibida. Te enviaremos un nuevo código pronto."))
      } else {
        await requestPasswordReset(emailOnly.trim())
        setInfo(t("login.forgot.sent", "Si el email existe, te hemos enviado un enlace para restablecer tu contraseña."))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.error.request", "No se pudo enviar la solicitud."))
    } finally {
      setLoading(false)
    }
  }

  // text-base (16px): por debajo de eso, iOS Safari hace zoom automático al enfocar el
  // input, y como es una SPA el zoom se queda "pegado" al navegar a /app/inicio tras
  // el login (no hay recarga real de página que lo resetee).
  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

  const title =
    mode === "login" ? t("login.title.login", "Inicia sesión")
    : mode === "register" ? t("login.title.register", "Crea tu cuenta")
    : mode === "request" ? t("login.title.request", "Solicitar un código")
    : t("login.title.forgot", "Recuperar contraseña")
  const subtitle =
    mode === "login" ? t("login.subtitle.login", "Accede a tu biblioteca táctica de Padel Film Room.")
    : mode === "register" ? t("login.subtitle.register", "Introduce tu código de invitación para unirte a la beta.")
    : mode === "request" ? t("login.subtitle.request", "¿Tu código ya se ha usado? Pide uno nuevo con tu email.")
    : t("login.subtitle.forgot", "Te enviaremos un enlace para crear una contraseña nueva.")

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight bg-film-room p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-7 flex items-center gap-3">
          <img
            src="/Logos/favicon_sinfondo.png"
            alt="Padel Film Room"
            className="h-11 w-11 object-contain"
          />
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
              placeholder={t("login.field.email", "Tu email")}
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
              {loading
                ? t("login.wait", "Un momento...")
                : mode === "request"
                  ? t("login.cta.request", "Solicitar código")
                  : t("login.cta.send-link", "Enviar enlace")}
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
                  placeholder={t("login.field.name", "Nombre (opcional)")}
                  className={inputCls}
                  autoComplete="name"
                />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={t("login.field.invite-code", "Código de invitación")}
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
              placeholder={t("login.field.email-short", "Email")}
              className={inputCls}
              autoComplete="email"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.field.password", "Contraseña")}
              className={inputCls}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
            >
              {loading
                ? t("login.wait", "Un momento...")
                : mode === "login"
                  ? t("login.cta.login", "Iniciar sesión")
                  : t("login.cta.register", "Crear cuenta")}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="w-full text-center text-xs text-white/50 transition hover:text-white"
              >
                {t("login.forgot-link", "¿Olvidaste tu contraseña?")}
              </button>
            )}
            {mode === "register" && (
              <button
                type="button"
                onClick={() => switchMode("request")}
                className="w-full text-center text-xs text-white/50 transition hover:text-white"
              >
                {t("login.request-link", "¿Tu código no funciona? Solicita otro")}
              </button>
            )}
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/60">
          {mode === "login" ? (
            <>
              {t("login.no-account", "¿No tienes cuenta?")}{" "}
              <button onClick={() => switchMode("register")} className="font-semibold text-neon-cyan hover:underline">
                {t("login.cta.go-register", "Regístrate")}
              </button>
            </>
          ) : mode === "register" ? (
            <>
              {t("login.has-account", "¿Ya tienes cuenta?")}{" "}
              <button onClick={() => switchMode("login")} className="font-semibold text-neon-cyan hover:underline">
                {t("login.title.login", "Inicia sesión")}
              </button>
            </>
          ) : (
            <button onClick={() => switchMode("login")} className="font-semibold text-neon-cyan hover:underline">
              {t("login.back-to-login", "Volver a iniciar sesión")}
            </button>
          )}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
