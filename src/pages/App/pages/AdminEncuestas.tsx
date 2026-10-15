import { useEffect, useState } from "react"
import { ClipboardList, Download } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { downloadSurveyCsv, getSurveyResponses, type AdminSurveyResponse } from "../../../lib/api/surveys"
import { SURVEYS } from "../surveys/definitions"

/**
 * AdminEncuestas — respuestas de las encuestas de la beta, por persona (solo Admin). Para que
 * Andrea agrupe dudas para la masterclass y contacte con quien tenga fricciones o esté muy
 * contento. Lista en pantalla y exportación a CSV (una columna por pregunta). La oleada se
 * deduce de la fecha de invitación.
 */

const fmt = (iso: string | null, lang: string) => {
  if (!iso) return "—"
  const d = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

const AdminEncuestas = () => {
  const { t, lang } = useI18n()
  const surveyIds = Object.keys(SURVEYS)
  const [surveyId, setSurveyId] = useState(surveyIds[0])
  const [rows, setRows] = useState<AdminSurveyResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const survey = SURVEYS[surveyId]

  useEffect(() => {
    setRows(null)
    setError(null)
    getSurveyResponses(surveyId)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : t("admin-surveys.error", "No se pudieron cargar las respuestas.")))
  }, [surveyId, t])

  const answered = rows?.filter((r) => r.submittedAtUtc) ?? []
  const pending = rows?.filter((r) => !r.submittedAtUtc) ?? []

  const optionLabel = (questionId: string, value: string) => {
    const q = survey.questions.find((x) => x.id === questionId)
    const o = q?.options?.find((x) => x.value === value)
    return o ? t(...o.label) : value
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadSurveyCsv(surveyId)
    } catch {
      setError(t("admin-surveys.export-error", "No se pudo exportar."))
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div className="mr-auto">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-surveys.title", "Encuestas")}</h1>
          <p className="text-sm text-white/60">
            {rows
              ? t("admin-surveys.counts", "{answered} respondidas · {pending} enviadas sin responder", { answered: answered.length, pending: pending.length })
              : t("common.loading", "Cargando...")}
          </p>
        </div>
        {surveyIds.length > 1 && (
          <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white sm:text-sm">
            {surveyIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/80 transition hover:text-white disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {t("admin-surveys.export", "Exportar CSV")}
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {rows && rows.length === 0 && (
        <p className="text-sm text-white/40">{t("admin-surveys.empty", "Todavía no se ha enviado ni respondido esta encuesta.")}</p>
      )}

      <ul className="max-w-3xl space-y-3">
        {answered.map((r) => (
          <li key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {r.displayName ? `${r.displayName} · ` : ""}
                <span className="font-normal text-white/70">{r.email}</span>
              </p>
              <p className="text-xs text-white/40">
                {r.language.toUpperCase()} · {t("admin-surveys.answered-at", "respondida")} {fmt(r.submittedAtUtc, lang)} · {t("admin-surveys.invited-at", "invitado")}{" "}
                {fmt(r.invitedAtUtc, lang)}
              </p>
            </div>
            <dl className="mt-3 space-y-2">
              {survey.questions
                .filter((q) => r.answers && r.answers[q.id] !== undefined)
                .map((q) => {
                  const v = r.answers![q.id]
                  const text = Array.isArray(v) ? v.map((x) => optionLabel(q.id, x)).join(" · ") : q.type === "text" ? v : optionLabel(q.id, v)
                  return (
                    <div key={q.id}>
                      <dt className="text-xs text-white/45">{t(...q.label)}</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm text-white/90">{text}</dd>
                    </div>
                  )
                })}
            </dl>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <details className="mt-8 max-w-3xl">
          <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-white/60">
            {t("admin-surveys.pending", "Enviadas sin responder")} ({pending.length})
          </summary>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            {pending.map((r) => (
              <li key={r.id}>
                {r.email} <span className="text-xs text-white/40">· {t("admin-surveys.sent-at", "enviada")} {fmt(r.sentAtUtc, lang)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  )
}

export default AdminEncuestas
