import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Sparkles, UploadCloud } from "lucide-react"
import { useApi } from "../../../lib/hooks/useApi"
import {
  getMyPersonalAnalysis,
  createDirectUpload,
  waitForVideoReady,
  submitPersonalAnalysis,
  editPersonalAnalysis,
  type MyPersonalAnalysis,
} from "../../../lib/api/personalAnalysis"
import { readVideoDuration, uploadToCloudflare } from "../../../lib/api/admin"
import FileDrop from "../components/FileDrop"
import HlsPlayer from "../../../lib/player/VideoPlayer"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Coach — pantalla propia del plan Coach (§rediseño Club/Coach, separada de Club.tsx: antes
 * vivía como una sección más dentro del hub, y para Club se veía como una barra vacía sin
 * explicar por qué). Quien no tiene Coach se manda directo a /app/precios — se probó primero
 * con un escaparate borroso aquí mismo y se veía mal, así que se pasó al mismo redirect que
 * usa Session.tsx.
 */

const PersonalAnalysisSection = () => {
  const { t, lang } = useI18n()
  const { data } = useApi(getMyPersonalAnalysis, [], "my-personal-analysis")
  const [override, setOverride] = useState<MyPersonalAnalysis | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = override ?? data
  const request = current?.request ?? null
  const canSubmit = current?.canSubmit ?? false

  // Editar un envío ya mandado, mientras siga en cola (§rediseño Club/Coach): el backend lo
  // rechaza en cuanto pasa a "en revisión", así que este botón solo aparece con "Submitted".
  const [editing, setEditing] = useState(false)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editNote, setEditNote] = useState("")
  const [editBusy, setEditBusy] = useState(false)
  const [editProgress, setEditProgress] = useState<{ label: string; percent: number } | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const startEdit = () => {
    setEditNote(request?.userNote ?? "")
    setEditFile(null)
    setEditError(null)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!request || editBusy) return
    setEditBusy(true)
    setEditError(null)
    try {
      let uid: string | undefined
      let durationSeconds: number | undefined
      if (editFile) {
        setEditProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: 0 })
        durationSeconds = await readVideoDuration(editFile)
        const up = await createDirectUpload(editFile.name, editFile.size)
        await uploadToCloudflare(up.uploadURL, editFile, (p) => setEditProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: p }))
        setEditProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
        await waitForVideoReady(up.uid)
        uid = up.uid
      }
      // La nota se manda siempre (aunque esté vacía) para poder borrarla; el vídeo solo si se
      // ha elegido uno nuevo — si no, el backend se queda con el que ya había.
      const updated = await editPersonalAnalysis(request.id, { uid, durationSeconds, note: editNote.trim() })
      setOverride({ canSubmit: false, request: updated })
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("club.personal-analysis.edit-error", "No se pudieron guardar los cambios."))
    } finally {
      setEditBusy(false)
      setEditProgress(null)
    }
  }

  const submit = async () => {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: 0 })
    try {
      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(file.name, file.size)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: p }))
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(up.uid)
      const created = await submitPersonalAnalysis(up.uid, dur, note.trim() || undefined)
      setOverride({ canSubmit: false, request: created })
      setFile(null)
      setNote("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("club.personal-analysis.error", "No se pudo enviar el partido."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "long" })

  return (
    <section className="rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.03] p-4 sm:p-6">
      {/* Último entregado, si lo hay */}
      {request?.status === "Delivered" && request.deliveredVideoUrl && (
        <div className="mb-6 space-y-6">
          <div className="overflow-hidden rounded-xl border border-white/10">
            <HlsPlayer src={request.deliveredVideoUrl} aspect="16:9" />
          </div>
          {request.deliveredPlanText && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-white/50">{t("club.personal-analysis.plan", "Plan de acción")}</p>
              <p className="whitespace-pre-wrap text-sm text-white/80">{request.deliveredPlanText}</p>
            </div>
          )}
        </div>
      )}

      {/* Formulario de envío, si toca */}
      {canSubmit && (
        <div className="space-y-3">
          <FileDrop file={file} onFile={setFile} label={t("club.personal-analysis.upload-label", "Sube 20 min de uno de tus partidos")} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("club.personal-analysis.note-placeholder", "¿Qué quieres que miremos? (opcional)")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          {progress && (
            <div>
              <p className="mb-1 text-xs text-white/50">{progress.label}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>
          )}
          <button
            onClick={submit}
            disabled={!file || busy}
            className="flex items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" />
            {busy ? t("club.personal-analysis.sending", "Enviando…") : t("club.personal-analysis.send", "Enviar partido")}
          </button>
        </div>
      )}

      {/* En curso, todavía no entregado */}
      {!canSubmit && request && request.status !== "Delivered" && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          {editing ? (
            <div className="space-y-3">
              <FileDrop
                file={editFile}
                onFile={setEditFile}
                label={t("club.personal-analysis.edit-upload-label", "Sustituir vídeo (opcional, se queda el que ya subiste si no eliges otro)")}
              />
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                rows={2}
                placeholder={t("club.personal-analysis.note-placeholder", "¿Qué quieres que miremos? (opcional)")}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
              />
              {editError && <p className="text-xs text-red-300">{editError}</p>}
              {editProgress && (
                <div>
                  <p className="mb-1 text-xs text-white/50">{editProgress.label}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${editProgress.percent}%` }} />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={editBusy}
                  className="flex items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editBusy ? t("club.personal-analysis.saving", "Guardando…") : t("club.personal-analysis.save", "Guardar cambios")}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={editBusy}
                  className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("club.personal-analysis.cancel", "Cancelar")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/70">
                {request.status === "InReview"
                  ? t("club.personal-analysis.in-review", "Recibido el {date} — lo estamos revisando.", { date: fmt(request.submittedAtUtc) })
                  : t("club.personal-analysis.submitted", "Recibido el {date} — en nuestra cola de revisión.", { date: fmt(request.submittedAtUtc) })}
              </p>
              {/* Solo mientras siga en cola — en cuanto pasa a "en revisión" el backend lo
                  rechazaría igualmente, pero así no se le ofrece un botón que va a fallar. */}
              {request.status === "Submitted" && (
                <button onClick={startEdit} className="shrink-0 text-xs font-semibold text-neon-cyan transition hover:brightness-110">
                  {t("club.personal-analysis.edit", "Editar")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Entregado, pero todavía dentro del ciclo: cuándo puede enviar el próximo */}
      {!canSubmit && request?.status === "Delivered" && request.cycleEndsAtUtc && (
        <p className="mt-3 text-xs text-white/50">
          {t("club.personal-analysis.next-cycle", "Podrás enviar tu próximo partido a partir del {date}.", { date: fmt(request.cycleEndsAtUtc) })}
        </p>
      )}
    </section>
  )
}

const Coach = () => {
  const { t } = useI18n()
  const { user } = useAuth()
  const hasCoach = hasFeature(user, "personalAnalysis")

  if (!hasCoach) return <Navigate to="/app/precios" replace />

  return (
    <main className="w-full space-y-6 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("coach.title", "Coach")}</h1>
          <p className="text-sm text-white/60">{t("coach.subtitle", "Tu análisis personalizado, partido a partido.")}</p>
        </div>
      </div>

      <PersonalAnalysisSection />
    </main>
  )
}

export default Coach
