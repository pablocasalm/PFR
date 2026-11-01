import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getUnsubscribeInfo, unsubscribe } from "../api/profile"
import { useI18n } from "../i18n/store"

/**
 * /baja?t=… — baja de los emails opcionales desde el enlace del propio email, sin iniciar sesión
 * (01/11/2026). Primero se pregunta y la baja se hace al pulsar el botón: los antivirus del
 * correo abren los enlaces solos y no deben dar de baja a nadie.
 */
const UnsubscribePage = () => {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = params.get("t") ?? ""
  const [state, setState] = useState<"loading" | "ask" | "done" | "invalid">("loading")
  const [kind, setKind] = useState<"news" | "newsletter">("news")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return setState("invalid")
    getUnsubscribeInfo(token)
      .then((info) => {
        setKind(info.kind)
        setState(info.done ? "done" : "ask")
      })
      .catch(() => setState("invalid"))
  }, [token])

  const confirm = async () => {
    setBusy(true)
    try {
      await unsubscribe(token)
      setState("done")
    } catch {
      setState("invalid")
    } finally {
      setBusy(false)
    }
  }

  const what =
    kind === "news"
      ? t("unsubscribe.what.news", "los avisos de novedades por email")
      : t("unsubscribe.what.newsletter", "el resumen mensual de PFR")

  return (
    <div className="flex min-h-screen items-center justify-center bg-midnight bg-film-room p-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-md">
        <img src="/Logos/favicon_sinfondo.png" alt="Padel Film Room" className="mb-6 h-11 w-11 object-contain" />
        {state === "loading" && <p className="text-sm text-white/60">{t("common.loading", "Cargando...")}</p>}
        {state === "ask" && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("unsubscribe.title", "Darte de baja")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("unsubscribe.ask", "¿Quieres dejar de recibir {what}? Los emails de tu cuenta y tu suscripción te seguirán llegando.", { what })}
            </p>
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="mt-6 w-full rounded-lg bg-neon-cyan py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? t("login.wait", "Un momento...") : t("unsubscribe.confirm", "Darme de baja")}
            </button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("unsubscribe.done-title", "Hecho")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("unsubscribe.done", "Ya no recibirás {what}. Si cambias de idea, puedes volver a activarlo en Mi Cuenta → Preferencias.", { what })}
            </p>
          </>
        )}
        {state === "invalid" && (
          <>
            <h1 className="font-display text-2xl font-bold">{t("unsubscribe.invalid-title", "Enlace no válido")}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("unsubscribe.invalid", "Este enlace no funciona. Puedes cambiar qué emails recibes en Mi Cuenta → Preferencias, o escribirnos a hello@padelfilmroom.com.")}
            </p>
          </>
        )}
        <Link to="/app/inicio" className="mt-6 inline-flex min-h-11 items-center text-sm text-white/50 transition hover:text-white">
          {t("unsubscribe.go-app", "Ir a la app")}
        </Link>
      </div>
    </div>
  )
}

export default UnsubscribePage
