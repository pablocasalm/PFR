import { useEffect, useState } from "react"
import { UserCircle } from "lucide-react"
import { useAuth, setLocalDisplayName } from "../../../lib/auth/store"
import { getMyProfile, updateProfile, changePassword, type ProfileResponse } from "../../../lib/api/profile"

/**
 * Mi cuenta — autogestión básica del perfil (§MVP): ver email/plan/rol, cambiar nombre visible
 * y cambiar contraseña. Sin avatar, sin cambiar email, sin borrar cuenta — se queda para más
 * adelante si hace falta.
 */

const ROLE_LABEL: Record<string, string> = { User: "Beta tester", ContentCreator: "Creador de contenido", Admin: "Administrador" }
const PLAN_LABEL: Record<string, string> = { Free: "Gratis", TrialThenPaid: "Prueba 14 días", Discounted: "Descuento" }
const PLAN_CLS: Record<string, string> = {
  Free: "border-white/15 bg-white/5 text-white/60",
  TrialThenPaid: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  Discounted: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

const MiCuenta = () => {
  const { user } = useAuth()

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

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        setProfile(res)
        setName(res.displayName ?? "")
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "No se pudieron cargar los datos de la cuenta."))
  }, [])

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
      setPwError("La nueva contraseña debe tener al menos 6 caracteres.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError("Las contraseñas nuevas no coinciden.")
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
      setPwError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña.")
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <main className="w-full max-w-2xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <UserCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Mi cuenta</h1>
          <p className="text-sm text-white/60">Datos de tu perfil y acceso.</p>
        </div>
      </div>

      {loadError && <p className="mb-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>}

      {/* Información de la cuenta (solo lectura) */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">Información de la cuenta</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Email</dt>
            <dd className="text-white">{profile?.email ?? user?.email ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Rol</dt>
            <dd className="text-white">{profile ? (ROLE_LABEL[profile.role] ?? profile.role) : "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-white/50">Plan</dt>
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
      </section>

      {/* Nombre visible */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">Nombre visible</h2>
        <form onSubmit={saveName} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameSaved(false)
            }}
            placeholder="Tu nombre"
            className={inputCls}
            autoComplete="name"
            maxLength={80}
          />
          {nameError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{nameError}</p>}
          {nameSaved && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">Nombre actualizado.</p>}
          <button
            type="submit"
            disabled={!name.trim() || nameSaving}
            className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nameSaving ? "Guardando..." : "Guardar nombre"}
          </button>
        </form>
      </section>

      {/* Cambiar contraseña */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">Cambiar contraseña</h2>
        <form onSubmit={savePassword} className="space-y-3">
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setPwSaved(false)
            }}
            placeholder="Contraseña actual"
            className={inputCls}
            autoComplete="current-password"
          />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setPwSaved(false)
            }}
            placeholder="Nueva contraseña"
            className={inputCls}
            autoComplete="new-password"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setPwSaved(false)
            }}
            placeholder="Repite la nueva contraseña"
            className={inputCls}
            autoComplete="new-password"
          />
          {pwError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{pwError}</p>}
          {pwSaved && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">Contraseña actualizada.</p>}
          <button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirmPassword || pwSaving}
            className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pwSaving ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </form>
      </section>
    </main>
  )
}

export default MiCuenta
