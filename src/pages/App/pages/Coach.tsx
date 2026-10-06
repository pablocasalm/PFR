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
import SidePanel from "../../../lib/ui/SidePanel"
import FileDrop from "../components/FileDrop"
import { DeliveredAnalysisView, PastAnalysesList } from "../components/CoachAnalysis"
import CoachProgress from "../components/CoachProgress"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import type { PersonalAnalysisItem, PlayerSide, PriorityLog } from "../../../lib/api/types"

/**
 * Coach — pantalla propia del plan Coach (§rediseño Club/Coach, separada de Club.tsx). Quien no
 * tiene Coach se manda directo a /app/precios.
 *
 * La pantalla es, ante todo, el progreso del alumno: su resumen, el análisis del mes con su
 * ficha y los anteriores. Enviar un partido es una acción aparte — un botón que abre un panel —
 * para no mezclar el formulario con los datos. Quien todavía no ha enviado nada ve solo la
 * invitación a enviar el primero.
 */

/** Pregunta de dos opciones del formulario de envío (lado, mano, posición en el vídeo). */
const Choice = <T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T | ""
  onChange: (value: T) => void
  options: [T, string][]
}) => (
  <div>
    <p className="mb-1.5 text-xs font-medium text-white/60">{label}</p>
    <div className="flex gap-2">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            value === v ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/70"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  </div>
)

/** Formulario de envío del partido (dentro del panel lateral). */
const SubmitForm = ({
  lastProfile,
  onSubmitted,
}: {
  lastProfile: MyPersonalAnalysis["lastPlayerProfile"]
  onSubmitted: (created: PersonalAnalysisItem) => void
}) => {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  // Quién es el jugador en el vídeo: obligatorio, para que Guille sepa a quién mirar sin tener
  // que preguntar (§reporte de beta). Lado y mano casi no cambian de un mes a otro, así que se
  // traen del envío anterior.
  const [side, setSide] = useState<PlayerSide | "">(lastProfile?.playerSide ?? "")
  const [hand, setHand] = useState<PlayerSide | "">(lastProfile?.playerHand ?? "")
  const [start, setStart] = useState<"near" | "far" | "">("")
  const [look, setLook] = useState("")
  const [context, setContext] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const playerReady = side !== "" && hand !== "" && start !== "" && look.trim() !== ""

  const submit = async () => {
    if (!file || busy || side === "" || hand === "" || start === "" || !look.trim()) return
    setBusy(true)
    setError(null)
    setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: 0 })
    try {
      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(file.name, file.size, dur)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: p }))
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(up.uid)
      const created = await submitPersonalAnalysis(
        up.uid,
        dur,
        { playerSide: side, playerHand: hand, playerStart: start, playerLook: look.trim(), matchContext: context.trim() || undefined },
        note.trim() || undefined,
      )
      onSubmitted(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("club.personal-analysis.error", "No se pudo enviar el partido."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="space-y-3">
      <FileDrop file={file} onFile={setFile} label={t("club.personal-analysis.upload-label", "Sube 20 min de uno de tus partidos")} />

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t("coach.player.title", "Para saber quién eres en el vídeo")}</p>
        <div className="grid gap-3">
          <Choice
            label={t("coach.player.side", "Lado en el que juegas")}
            value={side}
            onChange={setSide}
            options={[
              ["right", t("coach.player.side-right", "Derecha")],
              ["left", t("coach.player.side-left", "Revés")],
            ]}
          />
          <Choice
            label={t("coach.player.hand", "Mano dominante")}
            value={hand}
            onChange={setHand}
            options={[
              ["right", t("coach.player.hand-right", "Diestro")],
              ["left", t("coach.player.hand-left", "Zurdo")],
            ]}
          />
          <Choice
            label={t("coach.player.start", "Dónde empiezas en el vídeo")}
            value={start}
            onChange={setStart}
            options={[
              ["near", t("coach.player.start-near", "Cerca de la cámara")],
              ["far", t("coach.player.start-far", "Lejos de la cámara")],
            ]}
          />
        </div>
        {/* Etiqueta encima y ejemplo corto dentro: en móvil un ejemplo largo se cortaba. */}
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/60">{t("coach.player.look-label", "Cómo reconocerte")}</span>
          <input
            value={look}
            onChange={(e) => setLook(e.target.value)}
            maxLength={300}
            placeholder={t("coach.player.look-example", "Camiseta roja, gorra blanca…")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/60">{t("coach.player.context-label", "Contexto del partido (opcional)")}</span>
          <input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={500}
            placeholder={t("coach.player.context-example", "Torneo o amistoso, resultado…")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
        </label>
      </div>
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
        disabled={!file || !playerReady || busy}
        className="flex items-center justify-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud className="h-4 w-4" />
        {busy ? t("club.personal-analysis.sending", "Enviando…") : t("coach.upload-match", "Subir partido")}
      </button>
    </div>
  )
}

/** Partido enviado y todavía sin entregar: estado y, mientras siga en cola, corregir el envío. */
const PendingCard = ({ request, onUpdated }: { request: PersonalAnalysisItem; onUpdated: (updated: PersonalAnalysisItem) => void }) => {
  const { t, lang } = useI18n()
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long" })
  // Editar solo mientras siga en cola: el backend lo rechaza en cuanto pasa a "en revisión".
  const [editing, setEditing] = useState(false)
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editNote, setEditNote] = useState("")
  const [editBusy, setEditBusy] = useState(false)
  const [editProgress, setEditProgress] = useState<{ label: string; percent: number } | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const startEdit = () => {
    setEditNote(request.userNote ?? "")
    setEditFile(null)
    setEditError(null)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (editBusy) return
    setEditBusy(true)
    setEditError(null)
    try {
      let uid: string | undefined
      let durationSeconds: number | undefined
      if (editFile) {
        setEditProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: 0 })
        durationSeconds = await readVideoDuration(editFile)
        const up = await createDirectUpload(editFile.name, editFile.size, durationSeconds)
        await uploadToCloudflare(up.uploadURL, editFile, (p) => setEditProgress({ label: t("club.personal-analysis.uploading", "Subiendo tu partido…"), percent: p }))
        setEditProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
        await waitForVideoReady(up.uid)
        uid = up.uid
      }
      // La nota se manda siempre (aunque esté vacía) para poder borrarla; el vídeo solo si se
      // ha elegido uno nuevo — si no, el backend se queda con el que ya había.
      onUpdated(await editPersonalAnalysis(request.id, { uid, durationSeconds, note: editNote.trim() }))
      setEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("club.personal-analysis.edit-error", "No se pudieron guardar los cambios."))
    } finally {
      setEditBusy(false)
      setEditProgress(null)
    }
  }

  return (
    <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/[0.06] p-4">
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
  )
}

/** Cómo funciona Coach, siempre visible (§cambio 7): tres pasos, en fila desde `sm`. */
const HowItWorks = () => {
  const { t } = useI18n()
  const steps = [
    t("coach.how.step-1", "Sube un partido tuyo (hasta 20 min). Uno por cada mes de suscripción."),
    t("coach.how.step-2", "Lo analizamos y te devolvemos un vídeo con tus prioridades del mes, en un máximo de 7 días laborables."),
    t("coach.how.step-3", "Trabájalas en pista. En tu siguiente análisis revisamos cómo ha ido."),
  ]
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-white/50">{t("coach.how.title", "Cómo funciona")}</h2>
      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neon-cyan text-xs font-bold text-midnight">{i + 1}</span>
            <span className="text-sm leading-snug text-white/75">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

const h2Cls = "text-sm font-bold uppercase tracking-[0.12em] text-white"

const Coach = () => {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const hasCoach = hasFeature(user, "personalAnalysis")
  const { data } = useApi(getMyPersonalAnalysis, [], "my-personal-analysis")
  const [override, setOverride] = useState<MyPersonalAnalysis | null>(null)
  const [sending, setSending] = useState(false)
  // Lo que el alumno anota en esta visita, para que el resumen de progreso se mueva al momento.
  const [logChanges, setLogChanges] = useState<Record<number, PriorityLog[]>>({})

  if (!hasCoach) return <Navigate to="/app/precios" replace />

  const current = override ?? data
  const request = current?.request ?? null
  const canSubmit = current?.canSubmit ?? false
  const history = current?.history ?? []
  const periodEnd = current?.currentPeriodEndsAtUtc ?? null

  // El análisis "del mes" es el último entregado: el propio envío si ya lo está, o el anterior
  // mientras el nuevo se analiza (así el alumno sigue viendo y anotando sus prioridades).
  const requestDelivered = request?.status === "Delivered" && !!request.deliveredVideoUrl
  const latest = requestDelivered ? request : (history[0] ?? null)
  const older = requestDelivered ? history : history.slice(1)
  const pending = request && request.status !== "Delivered" ? request : null
  const isNew = !!current && !request && history.length === 0

  const withLogs = (a: PersonalAnalysisItem): PersonalAnalysisItem => ({
    ...a,
    priorities: (a.priorities ?? []).map((p) => (logChanges[p.id] ? { ...p, logs: logChanges[p.id] } : p)),
  })

  // Fechas en el idioma de la app: "28 de octubre" / "October 28".
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "long" })

  // Una sola línea de estado según el momento del ciclo (§documento de Andrea, cambio 8).
  const statusLine = !current || isNew
    ? null
    : canSubmit
      ? periodEnd
        ? t("coach.status.can-send-until", "Ya puedes enviar tu partido de este mes. Tienes hasta el {date}.", { date: fmt(periodEnd) })
        : t("coach.status.can-send", "Ya puedes enviar tu partido de este mes.")
      : pending
        ? null // lo dice ya su propia tarjeta (PendingCard), con la fecha de envío
        : request?.cycleEndsAtUtc
          ? `${t("coach.status.ready", "Tu análisis está listo.")} ${t("coach.status.next-from", "Podrás enviar tu próximo partido a partir del {date}.", { date: fmt(request.cycleEndsAtUtc) })}`
          : t("coach.status.ready", "Tu análisis está listo.")

  const sendButton = (label: string, big = false) => (
    <button
      onClick={() => setSending(true)}
      className={`flex shrink-0 items-center justify-center gap-2 rounded-lg bg-neon-cyan font-bold text-midnight transition hover:brightness-110 ${big ? "px-6 py-3 text-base" : "px-4 py-2.5 text-sm"}`}
    >
      <UploadCloud className={big ? "h-5 w-5" : "h-4 w-4"} />
      {label}
    </button>
  )

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

      {/* Todavía no ha enviado nada: solo la invitación a enviar el primero */}
      {isNew && (
        <>
          <section className="flex flex-col items-center rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.03] px-5 py-12 text-center sm:py-16">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
              <UploadCloud className="h-7 w-7" />
            </span>
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">{t("coach.empty.title", "Envía tu primer partido")}</h2>
            <p className="mb-6 mt-2 max-w-md text-sm leading-relaxed text-white/65">
              {t("coach.empty.text", "Sube 20 minutos de un partido tuyo. Lo analizamos y aquí tendrás tu vídeo comentado, tus prioridades del mes y tu progreso, partido a partido.")}
            </p>
            {sendButton(t("coach.empty.cta", "Enviar mi primer partido"), true)}
          </section>
          <HowItWorks />
        </>
      )}

      {/* Estado del ciclo y, si toca, el botón de enviar */}
      {statusLine && (
        <div className="flex flex-col gap-3 rounded-xl border border-neon-cyan/25 bg-neon-cyan/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-white">{statusLine}</p>
          {canSubmit && sendButton(t("coach.send-month", "Enviar mi partido de este mes"))}
        </div>
      )}

      {pending && <PendingCard request={pending} onUpdated={(updated) => setOverride({ ...current, canSubmit: false, request: updated })} />}

      {latest && <CoachProgress current={withLogs(latest)} history={older} />}

      {latest && (
        <section className="space-y-3">
          <h2 className={h2Cls}>
            {pending ? t("coach.latest.previous", "Tu último análisis") : t("coach.latest.title", "Tu análisis de este mes")}
          </h2>
          <div className="rounded-2xl border border-neon-cyan/20 bg-neon-cyan/[0.03] p-4 sm:p-6">
            <DeliveredAnalysisView analysis={latest} editable onLogsChange={(id, logs) => setLogChanges((prev) => ({ ...prev, [id]: logs }))} />
          </div>
        </section>
      )}

      {/* Análisis anteriores (§cambio 10): Coach revisa en cada análisis cómo fue el anterior. */}
      {older.length > 0 && (
        <section>
          <h2 className={`mb-3 ${h2Cls}`}>{t("coach.history.title", "Tus análisis anteriores")}</h2>
          <PastAnalysesList items={older} />
        </section>
      )}

      {sending && (
        <SidePanel
          title={isNew ? t("coach.empty.cta", "Enviar mi primer partido") : t("coach.send-month", "Enviar mi partido de este mes")}
          subtitle={t("coach.send.help", "Uno por cada mes de suscripción. Te lo devolvemos analizado en un máximo de 7 días laborables.")}
          onClose={() => setSending(false)}
        >
          <SubmitForm
            lastProfile={current?.lastPlayerProfile}
            onSubmitted={(created) => {
              // El recién enviado pasa a ser "el actual"; el que lo era baja al historial.
              setOverride({ ...current, canSubmit: false, request: created, history: requestDelivered && request ? [request, ...history] : history })
              setSending(false)
            }}
          />
        </SidePanel>
      )}
    </main>
  )
}

export default Coach
