import { useEffect, useRef, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { Check, Star, X } from "lucide-react"
import { useAuth } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { getRatingPrompt, sendRatingEvent, submitRating } from "../../../lib/api/ratings"

/** Solo se pide en pantallas de «estar por ahí»: nunca en el reproductor, formularios ni el panel. */
const ALLOWED_PATHS = /^\/app\/(inicio|explorar|mi-lista)(\/|$)/
/** Tiempo seguido en una de esas pantallas antes de enseñarla: que no salga nada más entrar. */
const SETTLE_MS = 20_000
/** Si en ese momento hay otra ventana abierta (Guardar en…, buscador, tour), se reintenta luego. */
const RETRY_MS = 5_000
const MAX_COMMENT = 2000

/** Hay algo encima de la pantalla: otra hoja o modal, el tour de bienvenida o un campo con el teclado abierto. */
const somethingOpen = () =>
  document.querySelector('[role="dialog"]') != null
  || document.body.classList.contains("driver-active")
  || document.body.style.overflow === "hidden"
  || (document.activeElement instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))

/**
 * Pide la valoración de la plataforma (estrellas y texto opcional) una vez que el backend dice que
 * toca (ver RatingPrompt en el backend: días de uso, espera creciente si no responde). Se pregunta
 * una vez por carga de la app; si toca, sale tras un rato en Inicio, Explorar o Mi Lista y sin
 * nada más abierto. Por debajo de xl es un modal centrado (aparece sin subir desde abajo); en
 * escritorio, una tarjeta abajo a la derecha que no bloquea la pantalla; mientras está abierta tapa
 * los botones de Feedback y del muñeco, que viven en esa esquina.
 *
 * Para verla en local sin cumplir las reglas: `?valoracion=1` (solo en desarrollo, no llama a la API).
 */
const RatingPrompt = () => {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const location = useLocation()
  const [params] = useSearchParams()
  const preview = import.meta.env.DEV && params.get("valoracion") === "1"

  const [eligible, setEligible] = useState(false)
  const [open, setOpen] = useState(false)
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState("")
  const [consentText, setConsentText] = useState(false)
  const [consentName, setConsentName] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)
  const asked = useRef(false)
  const done = useRef(false)

  // Una pregunta al servidor por carga de la app. Si el tour de bienvenida sale en esta visita, no.
  useEffect(() => {
    if (preview) {
      setEligible(true)
      return
    }
    if (asked.current || !user || !user.hasSeenOnboarding) return
    asked.current = true
    getRatingPrompt()
      .then((res) => setEligible(res.show))
      .catch(() => {})
  }, [user, preview])

  // Sale tras SETTLE_MS seguidos en una pantalla permitida; cambiar de pantalla reinicia la cuenta.
  const allowedHere = ALLOWED_PATHS.test(location.pathname)
  useEffect(() => {
    if (!eligible || open || done.current || !allowedHere) return
    let timer = window.setTimeout(function tryShow() {
      if (somethingOpen()) {
        timer = window.setTimeout(tryShow, RETRY_MS)
        return
      }
      done.current = true
      setOpen(true)
      if (!preview) sendRatingEvent("shown")
    }, preview ? 500 : SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [eligible, open, allowedHere, location.pathname, preview])

  // Modal (por debajo de xl): bloquea el scroll del fondo, como BottomSheet.
  useEffect(() => {
    if (!open || window.matchMedia("(min-width: 1280px)").matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const later = () => {
    if (!sent && !preview) sendRatingEvent("later")
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") later()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sent])

  if (!open) return null

  const happy = stars >= 4
  const text = comment.trim()
  const askConsent = happy && text.length > 0

  const onSubmit = async () => {
    if (stars === 0 || sending) return
    setSending(true)
    setError(false)
    try {
      if (!preview) {
        await submitRating({
          stars,
          comment: text || undefined,
          language: lang === "en" ? "en" : "es",
          consentPublishText: askConsent ? consentText : undefined,
          consentPublishName: askConsent ? consentText && consentName : undefined,
        })
      }
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setSending(false)
    }
  }

  const starLabels = [
    t("rating.star.1", "Nada bien"),
    t("rating.star.2", "Regular"),
    t("rating.star.3", "Bien"),
    t("rating.star.4", "Muy bien"),
    t("rating.star.5", "¡Me encanta!"),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 xl:inset-auto xl:p-0 xl:bottom-6 xl:right-6 xl:block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rating-title"
    >
      {/* Fondo solo en el modal (móvil/tableta); más alto que la pantalla, como en BottomSheet, para cubrir bajo las barras de Safari. */}
      <div className="absolute inset-x-0 -inset-y-32 bg-black/60 backdrop-blur-sm xl:hidden" onClick={later} />
      <div className="relative flex max-h-[85vh] max-h-[85dvh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-midnight shadow-glow motion-safe:animate-[rating-in_.25s_ease-out] xl:w-[22rem] xl:motion-safe:animate-[rating-up_.22s_ease-out]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          <button
            onClick={later}
            aria-label={t("common.close", "Cerrar")}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan/15 text-neon-cyan">
                <Check className="h-6 w-6" />
              </span>
              <p className="text-base font-semibold text-white">{t("rating.thanks.title", "¡Mil gracias!")}</p>
              <p className="text-sm text-white/70">
                {t("rating.thanks.body", "Lo leemos todo, y nos ayuda muchísimo a seguir mejorando PFR para ti.")}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="mt-1 min-h-[44px] rounded-lg border border-white/15 px-5 text-sm font-medium text-white transition hover:bg-white/5"
              >
                {t("common.close", "Cerrar")}
              </button>
            </div>
          ) : (
            <>
              <h2 id="rating-title" className="pr-8 text-lg font-bold text-white">
                {t("rating.title", "¿Qué tal te está yendo con PFR?")}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                {t("rating.subtitle", "¿Tienes 10 segundos para nosotros? Llevas unos días en PFR y nos encantaría saber qué tal te va.")}
              </p>

              <div className="mt-4 flex justify-center gap-1" role="radiogroup" aria-label={t("rating.stars-label", "Tu valoración")}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={stars === n}
                    aria-label={t("rating.star-aria", "{n} de 5 estrellas", { n })}
                    onClick={() => setStars(n)}
                    className="flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90"
                  >
                    <Star className={`h-9 w-9 transition ${n <= stars ? "fill-neon-lime text-neon-lime" : "text-white/30"}`} />
                  </button>
                ))}
              </div>
              <p className="mt-1 h-5 text-center text-sm font-medium text-neon-lime" aria-live="polite">
                {stars > 0 ? starLabels[stars - 1] : ""}
              </p>

              {/* Al elegir estrellas, la pregunta se despliega (altura y opacidad); sin movimiento si el sistema lo pide. */}
              {stars > 0 && (
                <div className="mt-3 overflow-hidden motion-safe:animate-[rating-expand_.4s_ease-out]">
                  <label htmlFor="rating-comment" className="text-sm font-semibold text-white">
                    {happy
                      ? t("rating.comment.happy", "¡Qué alegría! ¿Qué es lo que más te está gustando?")
                      : t("rating.comment.unhappy", "Gracias por contárnoslo. ¿Qué podríamos hacer mejor?")}
                  </label>
                  <textarea
                    id="rating-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
                    rows={3}
                    placeholder={t("rating.comment.placeholder", "Opcional, pero nos haría muchísima ilusión leerte")}
                    className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/60 focus:outline-none sm:text-sm"
                  />

                  {askConsent && (
                    <div className="mt-3 space-y-2 overflow-hidden motion-safe:animate-[rating-expand_.3s_ease-out]">
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-white/80">
                        <input
                          type="checkbox"
                          checked={consentText}
                          onChange={(e) => {
                            setConsentText(e.target.checked)
                            if (!e.target.checked) setConsentName(false)
                          }}
                          className="mt-0.5 h-5 w-5 shrink-0 accent-neon-cyan"
                        />
                        {t("rating.consent.text", "Podéis compartir mi comentario en la web de PFR")}
                      </label>
                      {consentText && (
                        <label className="flex cursor-pointer items-start gap-2 pl-7 text-sm text-white/80">
                          <input
                            type="checkbox"
                            checked={consentName}
                            onChange={(e) => setConsentName(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-neon-cyan"
                          />
                          {t("rating.consent.name", "…y poner mi nombre junto a él")}
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-400">{t("rating.error", "Vaya, no se ha podido enviar. ¿Lo intentas otra vez?")}</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={later}
                  className="min-h-[44px] flex-1 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/80 transition hover:bg-white/5"
                >
                  {t("rating.later", "Más tarde")}
                </button>
                <button
                  onClick={onSubmit}
                  disabled={stars === 0 || sending}
                  className="min-h-[44px] flex-1 rounded-lg bg-neon-cyan px-4 text-sm font-bold text-midnight transition disabled:opacity-40"
                >
                  {sending ? t("rating.sending", "Enviando…") : t("rating.send", "Enviar")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes rating-in { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes rating-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes rating-expand { from { max-height: 0; opacity: 0; transform: translateY(-6px); } to { max-height: 20rem; opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

export default RatingPrompt
