import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { Check, ClipboardList } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { ApiError } from "../../../lib/api/client"
import { getSurveyStatus, submitSurvey, type SurveyAnswers } from "../../../lib/api/surveys"
import { SURVEYS, isAnswered, isRequired, isVisible, type SurveyQuestion } from "../surveys/definitions"

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
  const { t } = useI18n()
  const value = answers[q.id]
  const required = isRequired(q, answers)
  const title = (
    <span className="block font-display text-base font-bold leading-snug text-white">
      {index > 0 && <span className="mr-2 text-neon-cyan">{index}.</span>}
      {t(...q.label)}
      {!required && <span className="ml-2 text-xs font-normal text-white/40">{t("survey.optional", "(opcional)")}</span>}
    </span>
  )

  return (
    <fieldset className="space-y-3">
      {q.intro && <p className="text-sm text-white/60">{t(...q.intro)}</p>}
      <legend className="contents">{title}</legend>
      {q.help && <p className="text-xs leading-relaxed text-white/50">{t(...q.help)}</p>}

      {q.type === "single" && (
        <div className="space-y-2" role="radiogroup">
          {q.options!.map((o) => {
            const on = value === o.value
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(q.id, o.value)} className={optionCls(on)}>
                <Marker on={on} square={false} />
                {t(...o.label)}
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

const Encuesta = () => {
  const { surveyId = "" } = useParams()
  const { t } = useI18n()
  const survey = SURVEYS[surveyId]
  const [status, setStatus] = useState<"loading" | "open" | "submitted" | "done">("loading")
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!survey) return
    getSurveyStatus(survey.id)
      .then((s) => setStatus(s.submitted ? "submitted" : "open"))
      .catch(() => setStatus("open"))
  }, [survey])

  const visible = useMemo(() => (survey ? survey.questions.filter((q) => isVisible(q, answers)) : []), [survey, answers])
  const missing = visible.filter((q) => isRequired(q, answers) && !isAnswered(answers[q.id]))

  if (!survey) return <Navigate to="/app/inicio" replace />

  const onChange = (id: string, value: SurveyAnswers[string] | undefined) =>
    setAnswers((prev) => {
      const next = { ...prev }
      if (value === undefined || (Array.isArray(value) && value.length === 0)) delete next[id]
      else next[id] = value
      return next
    })

  const send = async () => {
    if (busy || missing.length > 0) return
    setBusy(true)
    setError(null)
    // Solo lo que se ve: si cambió una respuesta y una pregunta de seguimiento se ocultó, no va.
    const payload: SurveyAnswers = {}
    for (const q of visible) if (isAnswered(answers[q.id])) payload[q.id] = answers[q.id]
    try {
      await submitSurvey(survey.id, payload)
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

          <div className="space-y-8">
            {visible.map((q) => (
              <Question
                key={q.id}
                q={q}
                // Las preguntas de seguimiento no llevan número propio.
                index={q.id.includes("_detalle") || q.id.includes("_motivo") ? 0 : survey.questions.filter((x) => !x.id.includes("_detalle") && !x.id.includes("_motivo")).indexOf(q) + 1}
                answers={answers}
                onChange={onChange}
              />
            ))}
          </div>

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
