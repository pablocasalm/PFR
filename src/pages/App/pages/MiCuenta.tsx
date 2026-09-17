import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { UserCircle, Settings2, CreditCard, Lock, type LucideIcon } from "lucide-react"
import { useAuth, setLocalDisplayName } from "../../../lib/auth/store"
import { getMyProfile, updateProfile, changePassword, updateMyPreferences, type ProfileResponse } from "../../../lib/api/profile"
import { createPortalSession } from "../../../lib/api/billing"
import { useI18n, setLanguage, type TFunc } from "../../../lib/i18n/store"

/**
 * Mi cuenta — autogestión básica del perfil (§MVP): ver email/plan/rol, cambiar nombre visible,
 * preferencias, suscripción y contraseña. Panel lateral con las secciones (carril de iconos en
 * móvil, sidebar con etiqueta en escritorio) en vez de todo apilado — solo se ve una a la vez.
 */

const roleLabel = (t: TFunc): Record<string, string> => ({
  User: t("mi-cuenta.role.user", "Beta tester"),
  ContentCreator: t("mi-cuenta.role.content-creator", "Creador de contenido"),
  Admin: t("mi-cuenta.role.admin", "Administrador"),
})
const planLabel = (t: TFunc): Record<string, string> => ({
  Free: t("mi-cuenta.plan.free", "Gratis"),
  TrialThenPaid: t("mi-cuenta.plan.trial", "Prueba 14 días"),
  Discounted: t("mi-cuenta.plan.discounted", "Descuento"),
})
const PLAN_CLS: Record<string, string> = {
  Free: "border-white/15 bg-white/5 text-white/60",
  TrialThenPaid: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  Discounted: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
}

const subStatusLabel = (t: TFunc): Record<string, string> => ({
  None: t("mi-cuenta.sub-status.none", "Sin suscripción de pago"),
  Trialing: t("mi-cuenta.sub-status.trialing", "En prueba"),
  Active: t("mi-cuenta.sub-status.active", "Activa"),
  PastDue: t("mi-cuenta.sub-status.past-due", "Pago pendiente"),
  Canceled: t("mi-cuenta.sub-status.canceled", "Cancelada"),
})
const SUB_STATUS_CLS: Record<string, string> = {
  None: "border-white/15 bg-white/5 text-white/60",
  Trialing: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  Active: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  PastDue: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  Canceled: "border-red-400/40 bg-red-400/10 text-red-300",
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

const getInitials = (nameOrEmail: string): string => {
  const trimmed = nameOrEmail.trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

type Section = "perfil" | "preferencias" | "suscripcion" | "seguridad"

const MiCuenta = () => {
  const { t, lang } = useI18n()
  const ROLE_LABEL = useMemo(() => roleLabel(t), [t])
  const PLAN_LABEL = useMemo(() => planLabel(t), [t])
  const SUB_STATUS_LABEL = useMemo(() => subStatusLabel(t), [t])
  const { user } = useAuth()

  const [section, setSection] = useState<Section>("perfil")

  const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
    { id: "perfil", label: t("mi-cuenta.nav.profile", "Perfil"), icon: UserCircle },
    { id: "preferencias", label: t("mi-cuenta.preferences", "Preferencias"), icon: Settings2 },
    { id: "suscripcion", label: t("mi-cuenta.nav.subscription", "Suscripción"), icon: CreditCard },
    { id: "seguridad", label: t("mi-cuenta.nav.security", "Seguridad"), icon: Lock },
  ]

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState(user?.displayName ?? "")
  const [nameSaving, setNameSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSaved, setNameSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSaved, setPwSaved] = useState(false)

  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const [prefSaving, setPrefSaving] = useState(false)
  const [prefError, setPrefError] = useState<string | null>(null)

  const openPortal = async () => {
    if (portalLoading) return
    setPortalLoading(true)
    setPortalError(null)
    try {
      const { url } = await createPortalSession()
      window.location.href = url
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : t("mi-cuenta.error.portal", "No se pudo abrir la gestión de la suscripción."))
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        setProfile(res)
        setName(res.displayName ?? "")
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : t("mi-cuenta.error.load", "No se pudieron cargar los datos de la cuenta.")))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // El idioma preferido vive en BD (§ idiomas preferidos): guarda ahí y cambia la interfaz al
  // momento, sin esperar a la próxima vez que se inicie sesión.
  const changeLanguage = async (l: "es" | "en") => {
    if (prefSaving || !profile || profile.preferredLanguage === l) return
    setPrefSaving(true)
    setPrefError(null)
    try {
      await updateMyPreferences({ preferredLanguage: l })
      setLanguage(l)
      setProfile((p) => (p ? { ...p, preferredLanguage: l } : p))
    } catch (err) {
      setPrefError(err instanceof Error ? err.message : t("mi-cuenta.error.preferences", "No se pudo guardar la preferencia."))
    } finally {
      setPrefSaving(false)
    }
  }

  const toggleSubtitlesDefault = async () => {
    if (prefSaving || !profile) return
    const next = !profile.subtitlesDefaultOn
    setPrefSaving(true)
    setPrefError(null)
    try {
      await updateMyPreferences({ subtitlesDefaultOn: next })
      setProfile((p) => (p ? { ...p, subtitlesDefaultOn: next } : p))
    } catch (err) {
      setPrefError(err instanceof Error ? err.message : t("mi-cuenta.error.preferences", "No se pudo guardar la preferencia."))
    } finally {
      setPrefSaving(false)
    }
  }

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || nameSaving) return
    setNameSaving(true)
    setNameError(null)
    setNameSaved(false)
    try {
      const res = await updateProfile(name.trim())
      setLocalDisplayName(res.displayName)
      setName(res.displayName)
      setNameSaved(true)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "No se pudo guardar el nombre.")
    } finally {
      setNameSaving(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwSaving) return
    setPwError(null)
    setPwSaved(false)
    if (newPassword.length < 6) {
      setPwError(t("mi-cuenta.password.error.too-short", "La nueva contraseña debe tener al menos 6 caracteres."))
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError(t("mi-cuenta.password.error.mismatch", "Las contraseñas nuevas no coinciden."))
      return
    }
    setPwSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPwSaved(true)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : t("mi-cuenta.password.error.generic", "No se pudo cambiar la contraseña."))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <UserCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("mi-cuenta.title", "Mi cuenta")}</h1>
          <p className="text-sm text-white/60">{t("mi-cuenta.subtitle", "Datos de tu perfil y acceso.")}</p>
        </div>
      </div>

      {loadError && <p className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>}

      <div className="grid grid-cols-[56px_1fr] items-start gap-3 sm:grid-cols-[190px_1fr] sm:gap-6">
        {/* Panel lateral: carril de iconos en móvil, sidebar con etiqueta en escritorio */}
        <nav className="sticky top-4 flex flex-col gap-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-center text-[10px] font-semibold leading-tight transition sm:flex-row sm:justify-start sm:gap-2.5 sm:rounded-lg sm:px-3 sm:py-2 sm:text-left sm:text-sm sm:font-medium ${
                section === id ? "bg-neon-cyan/10 text-neon-cyan" : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 sm:h-4 sm:w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Perfil: identidad + rol/plan + nombre visible */}
        {section === "perfil" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neon-cyan text-sm font-bold text-midnight">
                {getInitials(name || profile?.email || user?.email || "")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{name || t("mi-cuenta.name-placeholder", "Tu nombre")}</p>
                <p className="truncate text-xs text-white/50">{profile?.email ?? user?.email ?? "—"}</p>
              </div>
            </div>

            <dl className="mb-4 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-white/50">{t("mi-cuenta.role", "Rol")}</dt>
                <dd className="text-white">{profile ? (ROLE_LABEL[profile.role] ?? profile.role) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-white/50">{t("mi-cuenta.plan", "Plan")}</dt>
                <dd>
                  {profile ? (
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PLAN_CLS[profile.planType] ?? PLAN_CLS.Free}`}>
                      {PLAN_LABEL[profile.planType] ?? profile.planType}
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>

            <form onSubmit={saveName} className="space-y-2.5 border-t border-white/10 pt-4">
              <label className="block text-xs font-semibold text-white/50">{t("mi-cuenta.display-name", "Nombre visible")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameSaved(false)
                }}
                placeholder={t("mi-cuenta.name-placeholder", "Tu nombre")}
                className={inputCls}
                autoComplete="name"
                maxLength={80}
              />
              {nameError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{nameError}</p>}
              {nameSaved && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{t("mi-cuenta.name-saved", "Nombre actualizado.")}</p>}
              <button
                type="submit"
                disabled={!name.trim() || nameSaving}
                className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nameSaving ? t("mi-cuenta.saving", "Guardando...") : t("mi-cuenta.save-name", "Guardar nombre")}
              </button>
            </form>
          </section>
        )}

        {/* Preferencias: idioma y subtítulos por defecto */}
        {section === "preferencias" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">{t("mi-cuenta.preferences", "Preferencias")}</h2>

            {prefError && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{prefError}</p>}

            <div className="divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
                <span className="text-white">{t("mi-cuenta.language", "Idioma")}</span>
                <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
                  {(["es", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => changeLanguage(l)}
                      disabled={prefSaving}
                      className={`rounded-md px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        (profile?.preferredLanguage ?? lang) === l ? "bg-neon-cyan text-midnight" : "text-white/60 hover:text-white"
                      }`}
                    >
                      {l === "es" ? "Español" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 py-3">
                <span className="text-white">{t("mi-cuenta.subtitles-default", "Activar subtítulos automáticamente")}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={profile?.subtitlesDefaultOn ?? false}
                  onClick={toggleSubtitlesDefault}
                  disabled={prefSaving || !profile}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    profile?.subtitlesDefaultOn ? "bg-neon-cyan" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                      profile?.subtitlesDefaultOn ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Mi suscripción */}
        {section === "suscripcion" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">{t("mi-cuenta.subscription", "Mi suscripción")}</h2>
            <dl className="mb-4 divide-y divide-white/10 text-sm">
              <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-white/50">{t("mi-cuenta.status", "Estado")}</dt>
                <dd>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      SUB_STATUS_CLS[profile?.subscriptionStatus ?? "None"] ?? SUB_STATUS_CLS.None
                    }`}
                  >
                    {SUB_STATUS_LABEL[profile?.subscriptionStatus ?? "None"] ?? profile?.subscriptionStatus ?? "—"}
                  </span>
                </dd>
              </div>
              {profile?.subscriptionCurrentPeriodEndUtc && (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-white/50">{t("mi-cuenta.renews-on", "Renueva el")}</dt>
                  <dd className="text-white">
                    {new Date(profile.subscriptionCurrentPeriodEndUtc).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}
                  </dd>
                </div>
              )}
            </dl>

            {portalError && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{portalError}</p>}

            {profile?.subscriptionStatus && profile.subscriptionStatus !== "None" ? (
              <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {portalLoading ? t("mi-cuenta.opening", "Abriendo...") : t("mi-cuenta.manage-subscription", "Gestionar suscripción")}
              </button>
            ) : (
              <Link
                to="/app/precios"
                className="inline-block rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
              >
                {t("mi-cuenta.see-plans", "Ver planes")}
              </Link>
            )}
          </section>
        )}

        {/* Seguridad: cambiar contraseña */}
        {section === "seguridad" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/70">{t("mi-cuenta.nav.security", "Seguridad")}</h2>
            <form onSubmit={savePassword} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white/50">{t("mi-cuenta.current-password", "Contraseña actual")}</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPwSaved(false)
                  }}
                  placeholder="••••••••"
                  className={inputCls}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white/50">{t("reset-password.field.new", "Nueva contraseña")}</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPwSaved(false)
                  }}
                  placeholder="••••••••"
                  className={inputCls}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white/50">{t("mi-cuenta.confirm-new-password", "Repite la nueva contraseña")}</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPwSaved(false)
                  }}
                  placeholder="••••••••"
                  className={inputCls}
                  autoComplete="new-password"
                />
              </div>
              {pwError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{pwError}</p>}
              {pwSaved && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{t("mi-cuenta.password-saved", "Contraseña actualizada.")}</p>}
              <button
                type="submit"
                disabled={!currentPassword || !newPassword || !confirmPassword || pwSaving}
                className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pwSaving ? t("mi-cuenta.saving", "Guardando...") : t("mi-cuenta.change-password-cta", "Cambiar contraseña")}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

export default MiCuenta
