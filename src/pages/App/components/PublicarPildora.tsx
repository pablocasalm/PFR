import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { createDirectUpload, uploadToCloudflare, uploadCaptions, readVideoDuration, publishPill, getConcepts, createPublishToken, waitForVideoReady, deleteVideo, type ConceptOption } from "../../../lib/api/admin"
import { getBlocks } from "../../../lib/api/blocks"
import { useApi } from "../../../lib/hooks/useApi"
import { useTaxonomy } from "../../../lib/taxonomy"
import { useI18n } from "../../../lib/i18n/store"
import FileDrop from "./FileDrop"
import ConceptPicker from "./ConceptPicker"
import ConceptTranslationPanel from "./ConceptTranslationPanel"

/**
 * Publicar una píldora (tarjetas #134/#136, 07/11/2026): un vídeo corto y vertical con un consejo
 * concreto, suelto (no sale de ningún análisis). Mismo ciclo que los clips: se sube a Cloudflare
 * con el token de publicación, se espera a que se procese y se crea con POST /api/admin/pills.
 * Va siempre a un bloque (es lo que decide en qué grupo de píldoras sale); los conceptos son
 * opcionales.
 */

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

/** Ancho y alto del vídeo, para avisar si no es vertical. null si el navegador no lo lee. */
const readVideoSize = (file: File): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    const finish = (size: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url)
      resolve(size)
    }
    video.preload = "metadata"
    video.muted = true
    video.onloadedmetadata = () => finish(video.videoWidth && video.videoHeight ? { width: video.videoWidth, height: video.videoHeight } : null)
    video.onerror = () => finish(null)
    video.src = url
  })

const PublicarPildora = () => {
  const { t } = useI18n()
  const { data: blocksData } = useApi(getBlocks, [], "blocks")
  const blockNames = (blocksData ?? []).map((b) => b.nameEs)
  const tax = useTaxonomy()
  const { data: conceptCatalog } = useApi(getConcepts, [], "concepts")

  const [file, setFile] = useState<File | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [fileEn, setFileEn] = useState<File | null>(null)
  const [captionsEn, setCaptionsEn] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [description, setDescription] = useState("")
  const [descriptionEn, setDescriptionEn] = useState("")
  const [block, setBlock] = useState("")
  const [concepts, setConcepts] = useState<string[]>([])
  const [conceptTranslations, setConceptTranslations] = useState<Record<string, string>>({})

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)
  const [orphanUids, setOrphanUids] = useState<string[]>([])
  const [deletingUid, setDeletingUid] = useState<string | null>(null)

  // Hasta que se elige uno, el primero del catálogo.
  const chosenBlock = block || blockNames[0] || ""

  const onFile = (f: File | null) => {
    setFile(f)
    setSize(null)
    if (f) readVideoSize(f).then(setSize)
  }
  const notVertical = size != null && size.width >= size.height


  const reset = () => {
    setFile(null)
    setSize(null)
    setFileEn(null)
    setCaptionsEn(null)
    setTitle("")
    setTitleEn("")
    setDescription("")
    setDescriptionEn("")
    setBlock("")
    setConcepts([])
    setConceptTranslations({})
  }

  const publishOne = async () => {
    setError(null)
    setDone(null)
    if (!file) return setError(t("publicar.pill.error.no-video", "Sube el vídeo de la píldora."))
    if (!title.trim()) return setError(t("publicar.pill.error.no-title", "La píldora necesita un título."))
    if (!chosenBlock) return setError(t("publicar.pill.error.no-block", "Elige el bloque de la píldora."))

    setBusy(true)
    setOrphanUids([])
    const uploaded: string[] = []
    try {
      const publishToken = await createPublishToken()

      const label = t("publicar.pill.progress.video", "Subiendo la píldora…")
      setProgress({ label, percent: 0 })
      const dur = await readVideoDuration(file)
      const up = await createDirectUpload(title || file.name, file.size, publishToken, dur)
      uploaded.push(up.uid)
      await uploadToCloudflare(up.uploadURL, file, (p) => setProgress({ label, percent: p }))

      let uidEn: string | undefined
      if (fileEn) {
        const labelEn = t("publicar.pill.progress.video-en", "Subiendo la versión en inglés…")
        setProgress({ label: labelEn, percent: 0 })
        const durEn = await readVideoDuration(fileEn)
        const upEn = await createDirectUpload(`${title || file.name} (EN)`, fileEn.size, publishToken, durEn)
        uploaded.push(upEn.uid)
        await uploadToCloudflare(upEn.uploadURL, fileEn, (p) => setProgress({ label: labelEn, percent: p }))
        uidEn = upEn.uid
      }

      setProgress({ label: t("publicar.progress.processing", "Procesando vídeos en Cloudflare…"), percent: 100 })
      await Promise.all([waitForVideoReady(up.uid), ...(uidEn ? [waitForVideoReady(uidEn)] : [])])

      // Como en los clips: los subtítulos van al vídeo original y, si lo hay, también al doblado.
      if (captionsEn) {
        setProgress({ label: t("publicar.progress.captions", "Subiendo subtítulos…"), percent: 100 })
        await Promise.all([uploadCaptions(up.uid, captionsEn, publishToken), ...(uidEn ? [uploadCaptions(uidEn, captionsEn, publishToken)] : [])])
      }

      setProgress({ label: t("publicar.progress.creating", "Creando contenido…"), percent: 100 })
      const translations = Object.fromEntries(Object.entries(conceptTranslations).filter(([, v]) => v.trim().length > 0))
      await publishPill(
        {
          pill: {
            uid: up.uid,
            uidEn,
            title: title.trim(),
            titleEn: titleEn.trim() || undefined,
            description: description.trim(),
            descriptionEn: descriptionEn.trim() || undefined,
            durationSeconds: dur,
            block: chosenBlock,
            concepts,
          },
          conceptTranslations: Object.keys(translations).length > 0 ? translations : undefined,
        },
        publishToken,
      )

      setDone(t("publicar.pill.done", "¡Píldora publicada! Se está procesando en Cloudflare y estará disponible en unos minutos."))
      reset()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("publicar.error.generic", "No se pudo publicar el contenido."))
      // Lo ya subido a Cloudflare en este intento queda sin píldora: se ofrece borrarlo.
      setOrphanUids(uploaded)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const handleDeleteOrphan = async (uid: string) => {
    setDeletingUid(uid)
    try {
      await deleteVideo(uid)
      setOrphanUids((prev) => prev.filter((u) => u !== uid))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("publicar.error.delete-failed", "No se pudo borrar el vídeo de Cloudflare."))
    } finally {
      setDeletingUid(null)
    }
  }

  return (
    <div className="space-y-4">
      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {done}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
      {orphanUids.length > 0 && (
        <div className="space-y-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <p>
            {t(
              "publicar.error.orphans",
              "Estos vídeos ya se subieron a Cloudflare antes del fallo. Bórralos para no gastar cuota de minutos si no vas a reintentar con el mismo archivo:",
            )}
          </p>
          <ul className="space-y-1">
            {orphanUids.map((uid) => (
              <li key={uid} className="flex items-center justify-between gap-2">
                <code className="text-xs text-red-200">{uid}</code>
                <button
                  type="button"
                  disabled={deletingUid === uid}
                  onClick={() => handleDeleteOrphan(uid)}
                  className="shrink-0 rounded bg-red-500/20 px-2 py-1 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
                >
                  {deletingUid === uid ? t("publicar.error.deleting", "Borrando…") : t("publicar.error.delete", "Borrar de Cloudflare")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FileDrop
        file={file}
        onFile={onFile}
        label={t("publicar.pill.field.video", "Vídeo de la píldora")}
        hint={t("publicar.pill.field.video-hint", "En vertical (9:16), a ser posible a 1080×1920")}
      />
      {notVertical && (
        <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          {t("publicar.pill.not-vertical", "Este vídeo no es vertical ({w}×{h}). Las píldoras se ven a pantalla completa en vertical: con un vídeo horizontal saldrán bandas negras.", {
            w: size!.width,
            h: size!.height,
          })}
        </p>
      )}
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("publicar.pill.field.title", "Título de la píldora")} className={inputCls} />
        <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder={t("publicar.field.clip-title-en", "Título en inglés (opcional)")} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("publicar.field.description", "Descripción")} rows={3} className={inputCls} />
        <textarea value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder={t("publicar.field.description-en", "Descripción en inglés (opcional)")} rows={3} className={inputCls} />
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.pill.block", "Bloque")}</span>
          <select value={chosenBlock} onChange={(e) => (setBlock(e.target.value), setConcepts([]))} className={inputCls}>
            {blockNames.map((b) => (
              <option key={b} value={b} className="bg-midnight">
                {tax.byBlock.get(b)?.number ? `${tax.byBlock.get(b)!.number} · ${b}` : b}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.pill.concepts", "Conceptos (opcional)")}</span>
          <ConceptPicker block={chosenBlock} selected={concepts} onChange={setConcepts} />
        </div>
      </div>

      <ConceptTranslationPanel
        selectedConcepts={concepts}
        catalog={conceptCatalog ?? ([] as ConceptOption[])}
        translations={conceptTranslations}
        onChange={setConceptTranslations}
      />

      {busy && progress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{progress.label}</span>
            <span className="tabular-nums text-neon-cyan">{progress.percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      <button onClick={publishOne} disabled={busy} className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60">
        {busy ? t("publicar.publishing", "Publicando…") : t("publicar.pill.publish-cta", "Publicar píldora")}
      </button>
    </div>
  )
}

export default PublicarPildora
