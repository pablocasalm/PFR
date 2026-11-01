import { useEffect, useState } from "react"
import { useI18n } from "../../../../lib/i18n/store"
import { getEmailPreferences, updateEmailPreferences, type EmailPreferences } from "../../../../lib/api/profile"

/**
 * Filas de Mi Cuenta → Preferencias para los emails opcionales (01/11/2026): avisos de noticias
 * y resumen mensual. Los emails del servicio (pagos, contraseña…) no salen aquí: no se pueden
 * quitar. Van dentro de la lista de preferencias (divide-y del padre).
 */
const EmailPreferenceRows = () => {
  const { t } = useI18n()
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEmailPreferences().then(setPrefs).catch(() => {})
  }, [])

  const toggle = async (key: keyof EmailPreferences) => {
    if (!prefs || saving) return
    setSaving(true)
    setError(null)
    try {
      setPrefs(await updateEmailPreferences({ [key]: !prefs[key] }))
    } catch {
      setError(t("mi-cuenta.emails.error", "No se pudo guardar. Inténtalo de nuevo."))
    } finally {
      setSaving(false)
    }
  }

  const rows: { key: keyof EmailPreferences; label: string; help: string }[] = [
    {
      key: "news",
      label: t("mi-cuenta.emails.news", "Avisos de novedades por email"),
      help: t("mi-cuenta.emails.news-help", "Cuando publicamos contenido nuevo o cambios en la app. Las noticias siguen en la campana."),
    },
    {
      key: "newsletter",
      label: t("mi-cuenta.emails.newsletter", "Resumen mensual de PFR"),
      help: t("mi-cuenta.emails.newsletter-help", "Un email al mes con las novedades."),
    },
  ]

  return (
    <>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3 py-3">
          <span>
            <span className="block text-white">{row.label}</span>
            <span className="mt-0.5 block text-xs text-white/45">{row.help}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={prefs?.[row.key] ?? false}
            aria-label={row.label}
            onClick={() => toggle(row.key)}
            disabled={saving || !prefs}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
              prefs?.[row.key] ? "bg-neon-cyan" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                prefs?.[row.key] ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      ))}
      {error && <p className="py-2 text-xs text-red-300">{error}</p>}
    </>
  )
}

export default EmailPreferenceRows
