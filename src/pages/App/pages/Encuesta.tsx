import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Check, ClipboardList } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { ApiError } from "../../../lib/api/client"
import { getSurveyStatus, submitSurvey, type SurveyAnswers, type SurveyConsents } from "../../../lib/api/surveys"
import { getBillingPlans, type BillingPlans } from "../../../lib/api/billing"
import { COACH_EXTRA, SURVEYS, isAnswered, isRequired, isVisible, type SurveyDefinition, type SurveyQuestion } from "../surveys/definitions"

/**
 * Encuesta de la beta (/app/encuesta/:surveyId), a la que se llega desde el email del día 4 o del
 * día 12. Se responde una sola vez; si se vuelve a abrir, se ve "ya la enviaste". No exige
 * suscripción activa ni bloquea nada: es voluntaria (especificación de Andrea, 15/10/2026).
 */

const optionCls = (on: boolean) =>
  `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
    on ? "border-neon-cyan/60 bg-neon-cyan/10 text-white" : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25"
  }`

const Marker = ({ on, square }: { on: boolean; square: boolean }) => (
  <span
    className={`flex h-5 w-5 shrink-0 items-center justify-center border ${square ? "rounded-md" : "rounded-full"} ${
      on ? "border-neon-cyan bg-neon-cyan text-midnight" : "border-white/30"
    }`}
    aria-hidden
  >
    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
  </span>
)

/**
 * Precios de la pregunta de los planes (día 12): los de quien responde, leídos del servidor como en
 * Precios (fundador o normal, España o resto del mundo), una sola vez por visita. undefined
 * mientras carga; null si falla: entonces no se enseña precio, nunca uno que no sea el suyo.
 */
let plansRequest: Promise<BillingPlans | null> | null = null
const usePlans = (enabled: boolean) => {
  const [plans, setPlans] = useState<BillingPlans | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    plansRequest ??= getBillingPlans().catch(() => null)
    let cancelled = false
    plansRequest.then((p) => !cancelled && setPlans(p))
    return () => {
      cancelled = true
    }
  }, [enabled])
  return plans
}

const PLAN_TIER: Record<string, "Starter" | "Club" | "Coach"> = { essential: "Starter", club: "Club", coach: "Coach" }

const Question = ({
  q,
  index,
  answers,
  onChange,
}: {
  q: SurveyQuestion
  index: number
  answers: SurveyAnswers
  onChange: (id: string, value: SurveyAnswers[string] | undefined) => void
}) => {
  const { t, lang } = useI18n()
  const plans = usePlans(!!q.options?.some((o) => o.price))
  const priceText = (optionValue: string) => {
    const tier = PLAN_TIER[optionValue]
    const price = plans?.plans?.find((p) => p.tier === tier)?.prices?.find((p) => p.interval === "Monthly")
    if (!price) return null
    const money = (amount: number) =>
      new Intl.NumberFormat(lang === "en" ? "en-GB" : "es-ES", { style: "currency", currency: price.currency }).format(amount)
    return price.regularAmount && price.regularAmount > price.displayAmount
      ? t("survey.d12.q4.price-founder", "{price}/mes precio fundador. Después, {regular}/mes.", {
          price: money(price.displayAmount),
          regular: money(price.regularAmount),
        })
      : t("survey.d12.q4.price-regular", "{price}/mes", { price: money(price.displayAmount) })
  }
  const value = answers[q.id]
  const required = isRequired(q, answers)
  const title = (
    <span className={`block leading-snug ${q.followUp ? "text-sm font-medium text-white/80" : "font-display text-base font-bold text-white"}`}>
      {index > 0 && <span className="mr-2 text-neon-cyan">{index}.</span>}
      {t(...q.label)}
      {!required && <span className="ml-2 text-xs font-normal text-white/40">{t("survey.optional", "(opcional)")}</span>}
    </span>
  )

  return (
    <fieldset className="space-y-3" data-question={q.id}>
      {q.intro && <p className="text-sm text-white/60">{t(...q.intro)}</p>}
      <legend className="contents">{title}</legend>
      {q.help && <p className="text-xs leading-relaxed text-white/50">{t(...q.help)}</p>}

      {q.type === "single" && q.inline && (
        // Escala (1 a 5): en fila, un botón por número.
        <div className="flex gap-2" role="radiogroup">
          {q.options!.map((o) => {
            const on = value === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onChange(q.id, o.value)}
                className={`h-12 flex-1 rounded-xl border text-base font-bold transition ${
                  on ? "border-neon-cyan bg-neon-cyan text-midnight" : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25"
                }`}
              >
                {t(...o.label)}
              </button>
            )
          })}
        </div>
      )}

      {q.type === "single" && !q.inline && (
        <div className="space-y-2" role="radiogroup">
          {q.options!.map((o) => {
            const on = value === o.value
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(q.id, o.value)} className={`${optionCls(on)} ${o.description ? "items-start" : ""}`}>
                <span className={o.description ? "mt-0.5" : ""}>
                  <Marker on={on} square={false} />
                </span>
                {o.description ? (
                  // Plan (día 12): nombre, descripción y precio, como pide la especificación.
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">{t(...o.label)}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/60">{t(...o.description)}</span>
                    {o.price && priceText(o.value) && (
                      <span className="mt-1 block text-xs font-semibold text-neon-cyan">{priceText(o.value)}</span>
                    )}
                  </span>
                ) : (
                  t(...o.label)
                )}
              </button>
            )
          })}
        </div>
      )}

      {q.type === "multi" && (
        <div className="space-y-2">
          {q.options!.map((o) => {
            const list = Array.isArray(value) ? value : []
            const on = list.includes(o.value)
            const toggle = () => {
              if (on) return onChange(q.id, list.filter((v) => v !== o.value))
              // "Todavía no lo sé" va sola: marcarla desmarca las demás, y al revés.
              if (o.value === q.exclusive) return onChange(q.id, [o.value])
              onChange(q.id, [...list.filter((v) => v !== q.exclusive), o.value])
            }
            return (
              <button key={o.value} type="button" role="checkbox" aria-checked={on} onClick={toggle} className={optionCls(on)}>
                <Marker on={on} square />
                {t(...o.label)}
              </button>
            )
          })}
        </div>
      )}

      {q.type === "text" && (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(q.id, e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={q.placeholder ? t(...q.placeholder) : undefined}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
        />
      )}
    </fieldset>
  )
}

/** Preguntas visibles de una encuesta, con su número (las de seguimiento no llevan). */
const QuestionList = ({ def, answers, onChange }: { def: SurveyDefinition; answers: SurveyAnswers; onChange: (id: string, v: SurveyAnswers[string] | undefined) => void }) => {
  const numbered = def.questions.filter((q) => !q.followUp)
  return (
    <div className="space-y-8">
      {def.questions
        .filter((q) => isVisible(q, answers))
        .map((q) => (
          <Question key={q.id} q={q} index={q.followUp ? 0 : numbered.indexOf(q) + 1} answers={answers} onChange={onChange} />
        ))}
    </div>
  )
}

const Check2 = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-white/85">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#28f0e0]" />
    <span>{children}</span>
  </label>
)

const setAnswer = (prev: SurveyAnswers, id: string, value: SurveyAnswers[string] | undefined) => {
  const next = { ...prev }
  if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[id]
  else next[id] = value
  return next
}

/** Solo lo que se ve: si una pregunta de seguimiento se ocultó al cambiar de respuesta, no va. */
const visibleAnswers = (def: SurveyDefinition, answers: SurveyAnswers) => {
  const out: SurveyAnswers = {}
  for (const q of def.questions) if (isVisible(q, answers) && isAnswered(answers[q.id])) out[q.id] = answers[q.id]
  return out
}

const missingIn = (def: SurveyDefinition, answers: SurveyAnswers) =>
  def.questions.filter((q) => isVisible(q, answers) && isRequired(q, answers) && !isAnswered(answers[q.id]))

const Encuesta = () => {
  const { surveyId = "" } = useParams()
  const { t } = useI18n()
  const survey = SURVEYS[surveyId]
  const [status, setStatus] = useState<"loading" | "open" | "submitted" | "done">("loading")
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  // Día 12: bloque de Coach (si le toca) y las tres autorizaciones, sin marcar de partida.
  const [showCoach, setShowCoach] = useState(false)
  const [coachAnswers, setCoachAnswers] = useState<SurveyAnswers>({})
  const [consents, setConsents] = useState<SurveyConsents>({ publishText: false, publishName: false, contactVideo: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!survey) return
    getSurveyStatus(survey.id)
      .then((s) => {
        setShowCoach(!!s.coachExtra)
        setStatus(s.submitted ? "submitted" : "open")
      })
      .catch(() => setStatus("open"))
  }, [survey])

  const missing = useMemo(
    () => (survey ? [...missingIn(survey, answers), ...(showCoach ? missingIn(COACH_EXTRA, coachAnswers) : [])] : []),
    [survey, answers, showCoach, coachAnswers],
  )
  // Las autorizaciones solo se piden si ha escrito el mensaje para otros jugadores.
  const askConsents = !!survey?.consentsAfter && isAnswered(answers[survey.consentsAfter])

  if (!survey) return <Navigate to="/app/inicio" replace />

  const onChange = (id: string, value: SurveyAnswers[string] | undefined) => setAnswers((prev) => setAnswer(prev, id, value))
  const onCoachChange = (id: string, value: SurveyAnswers[string] | undefined) => setCoachAnswers((prev) => setAnswer(prev, id, value))

  const send = async () => {
    if (busy || missing.length > 0) return
    setBusy(true)
    setError(null)
    try {
      await submitSurvey(survey.id, visibleAnswers(survey, answers), {
        coachAnswers: showCoach ? visibleAnswers(COACH_EXTRA, coachAnswers) : undefined,
        consents: askConsents ? consents : undefined,
      })
      setStatus("done")
      window.scrollTo({ top: 0 })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setStatus("submitted")
      else setError(t("survey.error", "No se pudo enviar. Revisa tu conexión e inténtalo de nuevo."))
    } finally {
      setBusy(false)
    }
  }

  const thanks = (title: string, body: string) => (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
        <Check className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/60">{body}</p>
      <Link to="/app/inicio" className="mt-6 inline-flex rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110">
        {t("survey.back-home", "Volver a Inicio")}
      </Link>
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-2xl py-8">
      {status === "loading" && <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>}

      {status === "done" &&
        thanks(t("survey.thanks.title", "¡Gracias!"), t("survey.thanks.body", "Hemos recibido tus respuestas. Nos ayudan muchísimo a mejorar Padel Film Room."))}

      {status === "submitted" &&
        thanks(t("survey.already.title", "Ya la enviaste"), t("survey.already.body", "Esta encuesta ya está respondida. ¡Gracias por tu ayuda!"))}

      {status === "open" && (
        <>
          <div className="mb-8 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t(...survey.title)}</h1>
              <p className="mt-1 text-sm text-white/60">{t(...survey.subtitle)}</p>
              {/* Texto obligatorio según la especificación. */}
              <p className="mt-3 text-xs leading-relaxed text-white/50">
                {t(
                  "survey.privacy",
                  "Tus respuestas están asociadas a tu cuenta y solo las vemos nosotros. No publicaremos nada tuyo sin tu autorización expresa.",
                )}
              </p>
            </div>
          </div>

          <QuestionList def={survey} answers={answers} onChange={onChange} />

          {/* Autorizaciones del testimonio: tres casillas independientes, sin marcar. El texto
              del "detalle" va solo encima de la del vídeo (especificación, día 12). */}
          {askConsents && (
            <section className="mt-8 space-y-3">
              <h2 className="text-sm font-bold text-white">{t("survey.d12.consents.title", "¿Podemos usar lo que has escrito?")}</h2>
              <p className="text-xs text-white/50">{t("survey.d12.consents.help", "Marca solo lo que quieras. Puedes no marcar nada.")}</p>
              <Check2 checked={consents.publishText} onChange={(v) => setConsents((c) => ({ ...c, publishText: v }))}>
                {t("survey.d12.consent.publish-text", "Podéis publicar mi texto, sin cambiar el sentido.")}
              </Check2>
              <Check2 checked={consents.publishName} onChange={(v) => setConsents((c) => ({ ...c, publishName: v }))}>
                {t("survey.d12.consent.publish-name", "Podéis mostrar mi nombre.")}
              </Check2>
              <p className="pt-2 text-xs leading-relaxed text-white/60">
                {t("survey.d12.consent.video-help", "Si te animas a grabar un vídeo vertical de 20–30 segundos contando qué opinas de PFR, tendremos un detalle contigo.")}
              </p>
              <Check2 checked={consents.contactVideo} onChange={(v) => setConsents((c) => ({ ...c, contactVideo: v }))}>
                {t("survey.d12.consent.contact-video", "Podéis contactarme para grabar un vídeo vertical de 20–30 segundos.")}
              </Check2>
            </section>
          )}

          {/* Día 12 con Coach: el bloque extra, en el mismo formulario. */}
          {showCoach && (
            <section className="mt-10 border-t border-white/10 pt-8">
              <h2 className="font-display text-xl font-bold text-white">{t(...COACH_EXTRA.title)}</h2>
              <p className="mb-6 mt-1 text-sm text-white/60">{t(...COACH_EXTRA.subtitle)}</p>
              <QuestionList def={COACH_EXTRA} answers={coachAnswers} onChange={onCoachChange} />
            </section>
          )}

          {error && <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={busy || missing.length > 0}
              className="rounded-lg bg-neon-cyan px-6 py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? t("common.sending", "Enviando...") : t("survey.send", "Enviar respuestas")}
            </button>
            {missing.length > 0 && <p className="text-xs text-white/40">{t("survey.missing", "Responde las preguntas obligatorias para enviar.")}</p>}
          </div>
        </>
      )}
    </main>
  )
}

export default Encuesta
