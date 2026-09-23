import { useEffect, useState } from "react"
import { Sparkles, History, ChevronDown, CheckCircle2, Send, Trash2 } from "lucide-react"
import {
  adminListPersonalAnalysis,
  adminMarkInReview,
  adminDeliverPersonalAnalysis,
  adminDeletePersonalAnalysis,
  type AdminPersonalAnalysisItem,
} from "../../../lib/api/personalAnalysis"
import { createDirectUpload, uploadToCloudflare, readVideoDuration, createPublishToken, waitForVideoReady } from "../../../lib/api/admin"
import FileDrop from "../components/FileDrop"
import HlsPlayer from "../../../lib/player/VideoPlayer"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminCoach — cola de análisis tácticos personalizados (§Club hub, Fase 5, plan Coach, solo
 * Admin). Nuevo → En revisión → Entregado. La entrega reutiliza el ciclo de subida de admin.ts
 * (Guille sí puede pedir token de publicación) — la subida del propio usuario, en cambio, no
 * pasa por ahí (ver personalAnalysis.ts).
 */

const fmt = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  Submitted: { label: "Nuevo", cls: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  InReview: { label: "En revisión", cls: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  Delivered: { label: "Entregado", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
}

const RequestCard = ({
  item,
  onMarkInReview,
  onDelivered,
  onRemove,
}: {
  item: AdminPersonalAnalysisItem
  onMarkInReview: (item: AdminPersonalAnalysisItem) => void
  onDelivered: (item: AdminPersonalAnalysisItem) => void
  onRemove: (item: AdminPersonalAnalysisItem) => void
}) => {
  const { t, lang } = useI18n()
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [planText, setPlanText] = useState("")
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const deliver = async () => {
    if (!file || !planText.trim() || busy) return
    setBusy(true)
    setError(null)
    setProgress({ label: t("admin-coach.progress.video", "Subiendo el análisis…"), percent: 0 })
    try {
      const publishToken = await createPublishToken()
      await readVideoDuration(file) // solo para consistencia con el resto de subidas, no se usa aquí
      const up = await createDirectUpload(file.name, file.size, publishToken)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("admin-coach.progress.video", "Subiendo el análisis…"), percent: p }))
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(up.uid)
      await adminDeliverPersonalAnalysis(item.id, up.uid, planText.trim())
      onDelivered(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.deliver", "No se pudo entregar el análisis."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[item.status]?.cls}`}>
          {STATUS_META[item.status]?.label ?? item.status}
        </span>
        <span className="text-xs text-white/50">{item.userEmail ?? item.userName ?? `#${item.userId}`}</span>
        <span className="ml-auto text-xs text-white/40">{fmt(item.submittedAtUtc, lang)}</span>
        <button
          onClick={() => onRemove(item)}
          aria-label={t("admin-coach.delete-aria", "Eliminar solicitud")}
          className="flex items-center text-white/40 transition hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {item.userNote && <p className="mb-3 whitespace-pre-wrap text-sm text-white/80">{item.userNote}</p>}

      <div className="overflow-hidden rounded-lg border border-white/10">
        <HlsPlayer src={item.uploadedVideoUrl} aspect="16:9" />
      </div>

      {item.status !== "Delivered" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
          {item.status === "Submitted" && (
            <button
              onClick={() => onMarkInReview(item)}
              className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-white/70 transition hover:text-white"
            >
              {t("admin-coach.mark-in-review", "Marcar como en revisión")}
            </button>
          )}
          <button
            onClick={() => setDeliverOpen((v) => !v)}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1.5 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/15"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("admin-coach.deliver", "Entregar")}
          </button>
        </div>
      )}

      {deliverOpen && item.status !== "Delivered" && (
        <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
          <FileDrop file={file} onFile={setFile} label={t("admin-coach.field.video", "Vídeo analizado y comentado")} />
          <textarea
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            rows={4}
            placeholder={t("admin-coach.field.plan", "Plan de acción para el jugador...")}
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
            onClick={deliver}
            disabled={!file || !planText.trim() || busy}
            className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {busy ? t("admin-coach.delivering", "Entregando…") : t("admin-coach.confirm-deliver", "Confirmar entrega")}
          </button>
        </div>
      )}
    </article>
  )
}

const AdminCoach = () => {
  const { t } = useI18n()
  const [items, setItems] = useState<AdminPersonalAnalysisItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await adminListPersonalAnalysis()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.load", "No se pudo cargar la cola."))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  const pending = items.filter((i) => i.status !== "Delivered")
  const delivered = items.filter((i) => i.status === "Delivered")

  const markInReview = async (item: AdminPersonalAnalysisItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "InReview" } : i))) // optimista
    try {
      await adminMarkInReview(item.id)
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i))) // revierte
      setError(err instanceof Error ? err.message : t("admin-coach.error.update", "No se pudo actualizar."))
    }
  }

  const remove = async (item: AdminPersonalAnalysisItem) => {
    if (!window.confirm(t("admin-coach.confirm-delete", "¿Eliminar esta solicitud?"))) return
    try {
      await adminDeletePersonalAnalysis(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-coach.error.delete", "No se pudo eliminar."))
    }
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-coach.title", "Análisis personalizado")}</h1>
          <p className="text-sm text-white/60">{t("admin-coach.subtitle", "Partidos que suben los usuarios de Coach, para analizar y entregar.")}</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-white/40">{t("admin-coach.no-pending", "No hay partidos pendientes.")}</p>
      ) : (
        <div className="space-y-4">
          {pending.map((item) => (
            <RequestCard key={item.id} item={item} onMarkInReview={markInReview} onDelivered={() => refresh()} onRemove={remove} />
          ))}
        </div>
      )}

      {!loading && delivered.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
          >
            <History className="h-4 w-4" />
            {t("admin-coach.history", "Entregados")} ({delivered.length})
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && (
            <div className="mt-4 space-y-4">
              {delivered.map((item) => (
                <RequestCard key={item.id} item={item} onMarkInReview={markInReview} onDelivered={() => refresh()} onRemove={remove} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}

export default AdminCoach
