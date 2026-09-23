import { useEffect, useState } from "react"
import { Crown, Plus, Trash2, X } from "lucide-react"
import {
  createDirectUpload,
  uploadToCloudflare,
  uploadCaptions,
  readVideoDuration,
  createPublishToken,
  waitForVideoReady,
  createSession,
  type PublishChapterInput,
} from "../../../lib/api/admin"
import { adminListSessions, deleteSession } from "../../../lib/api/sessions"
import type { SessionSummary } from "../../../lib/api/types"
import FileDrop from "../components/FileDrop"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminSesiones — publica las sesiones tácticas mensuales grabadas (§Club hub, Fase 2). Mismo
 * ciclo de subida a Cloudflare que "Paso 1: Análisis" de Publicar.tsx, recortado: sin torneo
 * (jugadores/sede/categoría/ronda/año no aplican) y sin paso 2 de clips — un único vídeo, con
 * Mes en vez de fecha automática (mismo criterio que MonthlyPick.month).
 */

type ChapterDraft = { time: string; title: string; titleEn: string }
const emptyChapter = (): ChapterDraft => ({ time: "", title: "", titleEn: "" })

/** "mm:ss" o "hh:mm:ss" → segundos. null si el formato no es válido. Igual que Publicar.tsx. */
const parseTimeToSeconds = (text: string): number | null => {
  const parts = text.trim().split(":").map((p) => p.trim())
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null
  return parts.map(Number).reduce((acc, n) => acc * 60 + n, 0)
}

const currentMonth = () => new Date().toISOString().slice(0, 7) // "yyyy-MM"

const fmt = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric" })
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"

const AdminSesiones = () => {
  const { t, lang } = useI18n()

  const [file, setFile] = useState<File | null>(null)
  const [fileEn, setFileEn] = useState<File | null>(null)
  const [captionsEn, setCaptionsEn] = useState<File | null>(null)
  const [month, setMonth] = useState(currentMonth())
  const [title, setTitle] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [chapters, setChapters] = useState<ChapterDraft[]>([])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)

  const [items, setItems] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await adminListSessions())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.load", "No se pudo cargar el histórico."))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  const updateChapter = (i: number, patch: Partial<ChapterDraft>) =>
    setChapters((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addChapter = () => setChapters((cs) => [...cs, emptyChapter()])
  const removeChapter = (i: number) => setChapters((cs) => cs.filter((_, idx) => idx !== i))

  const reset = () => {
    setFile(null)
    setFileEn(null)
    setCaptionsEn(null)
    setMonth(currentMonth())
    setTitle("")
    setTitleEn("")
    setDescription("")
    setDescriptionEn("")
    setChapters([])
  }

  const publishSession = async () => {
    setError(null)
    setNotice(null)
    if (!file) return setError(t("admin-sesiones.error.no-video", "Sube el vídeo de la sesión."))
    if (!title.trim()) return setError(t("admin-sesiones.error.no-title", "La sesión necesita un título."))
    if (!month.trim()) return setError(t("admin-sesiones.error.no-month", "Indica el mes (yyyy-MM)."))

    const chapterInputs: PublishChapterInput[] = []
    for (const ch of chapters) {
      if (!ch.title.trim()) continue
      const startSeconds = parseTimeToSeconds(ch.time)
      if (startSeconds === null)
        return setError(t("admin-sesiones.error.bad-time", "Formato de tiempo inválido en el capítulo \"{title}\" (usa mm:ss).", { title: ch.title.trim() }))
      chapterInputs.push({ startSeconds, title: ch.title.trim(), titleEn: ch.titleEn.trim() || undefined })
    }

    setBusy(true)
    setProgress({ label: t("admin-sesiones.progress.video", "Subiendo sesión…"), percent: 0 })
    try {
      const publishToken = await createPublishToken()

      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(title || file.name, file.size, publishToken)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label: t("admin-sesiones.progress.video", "Subiendo sesión…"), percent: p }))
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(up.uid)

      let uidEn: string | undefined
      if (fileEn) {
        const labelEn = t("admin-sesiones.progress.video-en", "Subiendo doblaje en inglés…")
        setProgress({ label: labelEn, percent: 0 })
        const upEn = await createDirectUpload(`${title || file.name} (EN)`, fileEn.size, publishToken)
        await uploadToCloudflare(upEn.uploadURL, fileEn, (p) => setProgress({ label: labelEn, percent: p }))
        setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
        await waitForVideoReady(upEn.uid)
        uidEn = upEn.uid
      }
      if (captionsEn) {
        setProgress({ label: t("publicar.progress.captions", "Subiendo subtítulos…"), percent: 100 })
        const targets = [uploadCaptions(up.uid, captionsEn, publishToken)]
        if (uidEn) targets.push(uploadCaptions(uidEn, captionsEn, publishToken))
        await Promise.all(targets)
      }

      setProgress({ label: t("publicar.progress.creating", "Creando contenido…"), percent: 100 })
      await createSession(
        {
          uid: up.uid,
          uidEn,
          month: month.trim(),
          title,
          titleEn: titleEn.trim() || undefined,
          description,
          descriptionEn: descriptionEn.trim() || undefined,
          durationSeconds: dur,
          chapters: chapterInputs,
        },
        publishToken,
      )

      setNotice(t("admin-sesiones.published", "Sesión publicada."))
      reset()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.publish", "No se pudo publicar la sesión."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const remove = async (s: SessionSummary) => {
    if (!window.confirm(t("admin-sesiones.confirm-delete", "¿Borrar la sesión \"{title}\"?", { title: s.title }))) return
    try {
      await deleteSession(s.id)
      setItems((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-sesiones.error.delete", "No se pudo borrar."))
    }
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-sesiones.title", "Sesiones")}</h1>
          <p className="text-sm text-white/60">{t("admin-sesiones.subtitle", "Publica la sesión táctica mensual grabada para Club/Coach.")}</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        <FileDrop file={file} onFile={setFile} label={t("admin-sesiones.field.video", "Vídeo de la sesión")} />
        <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-white/70">{t("publicar.heygen-toggle", "¿Ya tienes el doblaje de HeyGen? Añádelo aquí")}</summary>
          <div className="mt-3 space-y-3">
            <FileDrop file={fileEn} onFile={setFileEn} label={t("publicar.field.en-video", "Vídeo en inglés (HeyGen)")} hint={t("common.optional", "Opcional")} />
            <FileDrop
              file={captionsEn}
              onFile={setCaptionsEn}
              label={t("publicar.field.en-captions", "Subtítulos en inglés (.srt o .vtt)")}
              accept=".srt,.vtt,text/vtt,application/x-subrip"
              hint={t("publicar.captions-hint", "Se aplican al vídeo en español y, si lo subes, también al doblado en inglés")}
            />
          </div>
        </details>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/50">{t("admin-sesiones.field.month", "Mes (yyyy-MM)")}</label>
          <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="2026-10" className={inputCls} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("admin-sesiones.field.title", "Título de la sesión")} className={inputCls} />
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder={t("publicar.field.analysis-title-en", "Título en inglés (opcional)")} className={inputCls} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("publicar.field.description", "Descripción")} rows={3} className={inputCls} />
          <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder={t("publicar.field.description-en", "Descripción en inglés (opcional)")} rows={3} className={inputCls} />
        </div>

        {/* Capítulos: misma UI que Publicar.tsx. */}
        <div className="space-y-2">
          <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.chapters", "Capítulos (opcional)")}</span>
          {chapters.map((ch, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center">
              <input value={ch.time} onChange={(e) => updateChapter(i, { time: e.target.value })} placeholder="mm:ss" className={`${inputCls} sm:w-24 sm:shrink-0`} />
              <input value={ch.title} onChange={(e) => updateChapter(i, { title: e.target.value })} placeholder={t("publicar.field.chapter-title", "Título del capítulo")} className={`${inputCls} flex-1`} />
              <input value={ch.titleEn} onChange={(e) => updateChapter(i, { titleEn: e.target.value })} placeholder={t("publicar.field.chapter-title-en", "Título en inglés (opcional)")} className={`${inputCls} flex-1`} />
              <button onClick={() => removeChapter(i)} className="self-end text-white/40 transition hover:text-red-400 sm:self-center" aria-label={t("publicar.remove-chapter", "Quitar capítulo")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button onClick={addChapter} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
            <Plus className="h-3.5 w-3.5" /> {t("publicar.add-chapter", "Añadir capítulo")}
          </button>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}
        {progress && (
          <div>
            <p className="mb-1 text-xs text-white/50">{progress.label}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        )}

        <button
          onClick={publishSession}
          disabled={busy}
          className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? t("admin-sesiones.publishing", "Publicando...") : t("admin-sesiones.publish", "Publicar sesión")}
        </button>
      </div>

      <div className="mt-10 max-w-2xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">
          {t("admin-sesiones.published-heading", "Publicadas")} {!loading && `(${items.length})`}
        </h2>
        {loading ? (
          <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-sesiones.none", "Todavía no has publicado ninguna sesión.")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((s) => (
              <li key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {s.month} · {s.title}
                    </p>
                    <p className="mt-1.5 text-xs text-white/40">{fmt(s.publishedAtUtc, lang)}</p>
                  </div>
                  <button
                    onClick={() => remove(s)}
                    aria-label={t("admin-sesiones.delete-aria", "Borrar sesión \"{title}\"", { title: s.title })}
                    className="flex shrink-0 items-center rounded-lg p-1.5 text-white/40 transition hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

export default AdminSesiones
