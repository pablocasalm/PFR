import { useState } from "react"
import { Plus, Trash2, X, CheckCircle2 } from "lucide-react"
import { createDirectUpload, uploadToCloudflare, uploadCaptions, readVideoDuration, publish, getConcepts, createPublishToken, waitForVideoReady, type PublishChapterInput, type ConceptOption } from "../../../lib/api/admin"
import { getBlocks } from "../../../lib/api/blocks"
import { useApi } from "../../../lib/hooks/useApi"
import CatalogPicker from "../components/CatalogPicker"
import FileDrop from "../components/FileDrop"
import ConceptTranslationPanel from "../components/ConceptTranslationPanel"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Publicar — Wizard de creación de contenido (§ proceso de publicación). Solo ContentCreator/Admin.
 * Paso 1: análisis (vídeo largo + torneo + jugadores). Paso 2: clips (cada uno con su vídeo y
 * grupos bloque→conceptos). Torneo/jugadores se heredan del análisis en los clips.
 * Título/descripción se piden en español e inglés a la vez (§ traducción de contenido) — igual
 * que el vídeo en inglés (HeyGen), es opcional: se puede publicar solo en español y traducir
 * después desde Editar.
 */

// Códigos, no texto libre: son iguales en español e inglés, así que la ronda no necesita
// traducción (§reporte de beta #53) y no hace falta pasarlos por t().
const ROUND_CODES = ["R64", "R32", "R16", "QF", "SF", "Final"]

type Group = { block: string; concepts: string[] }
type ClipDraft = {
  file: File | null
  fileEn: File | null
  captionsEn: File | null
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  groups: Group[]
}
type ChapterDraft = { time: string; title: string; titleEn: string }

const emptyClip = (defaultBlock: string): ClipDraft => ({
  file: null,
  fileEn: null,
  captionsEn: null,
  title: "",
  titleEn: "",
  description: "",
  descriptionEn: "",
  groups: [{ block: defaultBlock, concepts: [] }],
})
const emptyChapter = (): ChapterDraft => ({ time: "", title: "", titleEn: "" })

/**
 * Catálogo de referencia bloque→conceptos (§ Importar JSON), con la misma numeración anidada
 * que se usa en los códigos "bloque.concepto" del JSON (p. ej. "4.2" = 2º concepto del bloque 4).
 * Derivado de datos reales de uso (/api/explore) y confirmado con el usuario — el número de
 * bloque solo indexa esta tabla; el nombre resultante se valida contra el catálogo real de
 * bloques (blockNames) al importar, por si hubiera cambiado.
 */
const CONCEPT_CATALOG: { block: string; concepts: string[] }[] = [
  { block: "Juego desde el fondo", concepts: ["Decisiones", "Presión", "Defensa"] },
  { block: "Transición defensa-ataque", concepts: ["Media pista", "Subir", "Recuperar"] },
  // 3.4 "Presión" se sustituye por "Posición" (era un duplicado del 3.1 "Presión en red";
  // el 1.2 "Presión" del bloque 1 no se toca, es un concepto distinto).
  { block: "Juego en la red", concepts: ["Presión en red", "Mantener", "Espacios", "Posición"] },
  { block: "Uso del globo", concepts: ["Timing", "Globo"] },
  { block: "Gestión del ritmo del punto", concepts: ["Paciencia", "Bajar ritmo", "Cambio ritmo"] },
  { block: "Lectura táctica del rival", concepts: ["Lectura", "Insistencia", "Detectar Espacios"] },
  { block: "Uso táctico de golpes", concepts: ["Volea", "Bandeja", "Saque", "Resto", "Remate", "Chiquita"] },
  { block: "Juego en pareja", concepts: ["Sincronía", "Comunicación", "Cubrir"] },
]

/** "4.2" → { block: "Uso del globo", concept: "Globo" }. null si el código no es válido. */
const resolveConceptCode = (code: string): { block: string; concept: string } | null => {
  const m = code.trim().match(/^(\d+)\.(\d+)$/)
  if (!m) return null
  const block = CONCEPT_CATALOG[Number(m[1]) - 1]
  const concept = block?.concepts[Number(m[2]) - 1]
  return block && concept ? { block: block.block, concept } : null
}

type ImportChapter = { time: string; title: string; title_en?: string }
type ImportClip = { clip_id?: string; title: string; title_en?: string; description?: string; description_en?: string; tags?: string[] }
type ImportJson = {
  match_id?: string
  title: string
  title_en?: string
  description?: string
  description_en?: string
  players?: string[]
  venue?: string
  category?: string
  round?: string
  year?: number
  chapters?: ImportChapter[]
  clips: ImportClip[]
}

/** "mm:ss" o "hh:mm:ss" (solo dígitos y ":") → segundos. null si el formato no es válido. */
const parseTimeToSeconds = (text: string): number | null => {
  const parts = text.trim().split(":").map((p) => p.trim())
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null
  return parts.map(Number).reduce((acc, n) => acc * 60 + n, 0)
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

const StepDot = ({ n, label, active }: { n: number; label: string; active: boolean }) => (
  <div className="flex items-center gap-2">
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
        active ? "bg-neon-cyan text-midnight" : "border border-white/20 text-white/50"
      }`}
    >
      {n}
    </span>
    <span className={`text-sm font-medium ${active ? "text-white" : "text-white/40"}`}>{label}</span>
  </div>
)

const Publicar = () => {
  const { t } = useI18n()
  const { data: blocksData } = useApi(getBlocks, [], "blocks")
  const blockNames = (blocksData ?? []).map((b) => b.nameEs)
  const { data: conceptCatalog } = useApi(getConcepts, [], "concepts")

  const [step, setStep] = useState<1 | 2>(1)

  // Análisis
  const [aFile, setAFile] = useState<File | null>(null)
  const [aFileEn, setAFileEn] = useState<File | null>(null)
  const [aCaptionsEn, setACaptionsEn] = useState<File | null>(null)
  const [aTitle, setATitle] = useState("")
  const [aTitleEn, setATitleEn] = useState("")
  const [aDesc, setADesc] = useState("")
  const [aDescEn, setADescEn] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  const [venue, setVenue] = useState("")
  const [category, setCategory] = useState("")
  const [round, setRound] = useState("")
  const [year, setYear] = useState("")
  const [chapters, setChapters] = useState<ChapterDraft[]>([])

  // Clips
  const [clips, setClips] = useState<ClipDraft[]>([emptyClip(blockNames[0] ?? "")])

  // Traducción de conceptos nuevos (§ ver ConceptTranslationPanel): nameEs → nameEn escrito a mano.
  const [conceptTranslations, setConceptTranslations] = useState<Record<string, string>>({})

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)

  // Importar JSON (§ pre-rellenar el wizard desde un JSON preparado fuera de la app).
  const [importText, setImportText] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  const applyImport = () => {
    setImportError(null)
    let json: ImportJson
    try {
      json = JSON.parse(importText)
    } catch {
      return setImportError(t("publicar.import.bad-json", "El JSON no es válido."))
    }
    if (!json.title?.trim()) return setImportError(t("publicar.import.no-title", "Falta el título del análisis."))
    if (!Array.isArray(json.clips) || json.clips.length === 0)
      return setImportError(t("publicar.import.no-clips", "El JSON no tiene clips."))

    const warnings: string[] = []

    setATitle(json.title.trim())
    setATitleEn(json.title_en?.trim() ?? "")
    setADesc(json.description?.trim() ?? "")
    setADescEn(json.description_en?.trim() ?? "")
    setPlayers(json.players ?? [])
    setVenue(json.venue ?? "")
    setCategory(json.category ?? "")
    setRound(json.round ?? "")
    setYear(json.year ? String(json.year) : "")

    setChapters(
      (json.chapters ?? []).map((ch) => ({
        time: ch.time ?? "",
        title: ch.title ?? "",
        titleEn: ch.title_en ?? "",
      })),
    )

    const newClips: ClipDraft[] = json.clips.map((c) => {
      const byBlock = new Map<string, string[]>()
      for (const code of c.tags ?? []) {
        const resolved = resolveConceptCode(code)
        if (!resolved) {
          warnings.push(t("publicar.import.bad-code", 'Código de concepto no reconocido: "{code}" (clip "{title}")', { code, title: c.title }))
          continue
        }
        if (blockNames.length > 0 && !blockNames.includes(resolved.block)) {
          warnings.push(t("publicar.import.unknown-block", 'El bloque "{block}" del código "{code}" no existe en el catálogo actual', { block: resolved.block, code }))
        }
        const list = byBlock.get(resolved.block) ?? []
        list.push(resolved.concept)
        byBlock.set(resolved.block, list)
      }
      const groups: Group[] = Array.from(byBlock.entries()).map(([block, concepts]) => ({ block, concepts }))
      return {
        ...emptyClip(blockNames[0] ?? ""),
        title: c.title ?? "",
        titleEn: c.title_en ?? "",
        description: c.description ?? "",
        descriptionEn: c.description_en ?? "",
        groups: groups.length > 0 ? groups : [{ block: blockNames[0] ?? "", concepts: [] }],
      }
    })
    setClips(newClips)

    setImportError(warnings.length > 0 ? warnings.join(" · ") : null)
    setImportText("")
  }

  const updateClip = (i: number, patch: Partial<ClipDraft>) =>
    setClips((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const updateGroup = (ci: number, gi: number, patch: Partial<Group>) =>
    setClips((cs) =>
      cs.map((c, idx) =>
        idx === ci ? { ...c, groups: c.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)) } : c,
      ),
    )

  const addGroup = (ci: number) =>
    setClips((cs) => cs.map((c, idx) => (idx === ci ? { ...c, groups: [...c.groups, { block: blockNames[0] ?? "", concepts: [] }] } : c)))

  const removeGroup = (ci: number, gi: number) =>
    setClips((cs) => cs.map((c, idx) => (idx === ci ? { ...c, groups: c.groups.filter((_, j) => j !== gi) } : c)))

  // Conceptos ya escritos en OTROS clips de este mismo bloque, todavía sin guardar (el
  // análisis + todos sus clips se publican juntos en una sola petición al final) — para que
  // el buscador de conceptos los sugiera aunque el backend aún no los conozca (§ ver
  // CatalogPicker). Evita que "Subir" en un clip y "subir" en otro acaben siendo conceptos
  // distintos en BD solo por no haberse visto el uno al otro mientras se publicaban.
  const conceptsForBlock = (block: string) => {
    const set = new Set<string>()
    for (const c of clips) for (const g of c.groups) if (g.block === block) for (const concept of g.concepts) set.add(concept)
    return Array.from(set)
  }

  // Todos los conceptos seleccionados en cualquier clip, para el panel de traducción (§ abajo).
  const allSelectedConcepts = clips.flatMap((c) => c.groups.flatMap((g) => g.concepts))

  const updateChapter = (i: number, patch: Partial<ChapterDraft>) =>
    setChapters((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addChapter = () => setChapters((cs) => [...cs, emptyChapter()])
  const removeChapter = (i: number) => setChapters((cs) => cs.filter((_, idx) => idx !== i))

  const goToClips = () => {
    setError(null)
    if (!aFile) return setError(t("publicar.error.no-video", "Sube el vídeo del análisis."))
    if (!aTitle.trim()) return setError(t("publicar.error.no-title", "El análisis necesita un título."))
    setStep(2)
  }

  const publishAll = async () => {
    setError(null)
    setDone(null)
    const validClips = clips.filter((c) => c.file && c.title.trim())
    if (validClips.length === 0) return setError(t("publicar.error.no-clips", "Añade al menos un clip con vídeo y título."))

    const chapterInputs: PublishChapterInput[] = []
    for (const ch of chapters) {
      if (!ch.title.trim()) continue
      const startSeconds = parseTimeToSeconds(ch.time)
      if (startSeconds === null)
        return setError(t("publicar.error.bad-time", "Formato de tiempo inválido en el capítulo \"{title}\" (usa mm:ss).", { title: ch.title.trim() }))
      chapterInputs.push({
        startSeconds,
        title: ch.title.trim(),
        titleEn: ch.titleEn.trim() || undefined,
      })
    }

    setBusy(true)
    setProgress({ label: t("publicar.progress.analysis", "Subiendo análisis…"), percent: 0 })
    try {
      // Token de publicación (§ larga duración): se pide aquí, justo al pulsar "Publicar", no
      // al entrar en la pantalla — así solo existe cuando de verdad se va a usar. Dura 24h,
      // para que una publicación larga (varios vídeos grandes en los dos idiomas) no se corte
      // aunque la sesión normal caduque a mitad de subida.
      const publishToken = await createPublishToken()

      // 1) Subir el vídeo del análisis
      const aDur = await readVideoDuration(aFile!)
      const aUp = await createDirectUpload(aTitle || aFile!.name, aFile!.size, publishToken)
      await uploadToCloudflare(aUp.uploadURL, aFile!, (p) => setProgress({ label: t("publicar.progress.analysis", "Subiendo análisis…"), percent: p }))
      // Se espera a que Cloudflare termine de procesarlo (no solo de recibir los bytes) antes
      // de lanzar la siguiente subida — ver waitForVideoReady, evita el 413 por minutos
      // reservados de más mientras varios vídeos están a medio procesar a la vez.
      setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
      await waitForVideoReady(aUp.uid)

      let aUidEn: string | undefined
      if (aFileEn) {
        const labelEnAnalysis = t("publicar.progress.analysis-en", "Subiendo vídeo en inglés del análisis…")
        setProgress({ label: labelEnAnalysis, percent: 0 })
        const aUpEn = await createDirectUpload(`${aTitle || aFile!.name} (EN)`, aFileEn.size, publishToken)
        await uploadToCloudflare(aUpEn.uploadURL, aFileEn, (p) => setProgress({ label: labelEnAnalysis, percent: p }))
        setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
        await waitForVideoReady(aUpEn.uid)
        aUidEn = aUpEn.uid
      }
      // Los subtítulos no dependen del doblaje: se suben al vídeo español siempre y, si además
      // hay vídeo en inglés, también ahí — así se puede ver con cualquiera de los dos audios.
      if (aCaptionsEn) {
        setProgress({ label: t("publicar.progress.captions", "Subiendo subtítulos…"), percent: 100 })
        const targets = [uploadCaptions(aUp.uid, aCaptionsEn, publishToken)]
        if (aUidEn) targets.push(uploadCaptions(aUidEn, aCaptionsEn, publishToken))
        await Promise.all(targets)
      }

      // 2) Subir cada clip
      const clipInputs = []
      for (let i = 0; i < validClips.length; i++) {
        const c = validClips[i]
        const label = t("publicar.progress.clip", "Subiendo clip {n} de {total}…", { n: i + 1, total: validClips.length })
        setProgress({ label, percent: 0 })
        const dur = await readVideoDuration(c.file!)
        const up = await createDirectUpload(c.title || c.file!.name, c.file!.size, publishToken)
        await uploadToCloudflare(up.uploadURL, c.file!, (p) => setProgress({ label, percent: p }))
        // Ver comentario en la subida del análisis: se espera a que termine de procesarse antes
        // de pedir la siguiente subida, para no acumular reservas provisionales de minutos.
        setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
        await waitForVideoReady(up.uid)

        let uidEn: string | undefined
        if (c.fileEn) {
          const labelEn = t("publicar.progress.clip-en", "Subiendo vídeo en inglés del clip {n}…", { n: i + 1 })
          setProgress({ label: labelEn, percent: 0 })
          const upEn = await createDirectUpload(`${c.title || c.file!.name} (EN)`, c.fileEn.size, publishToken)
          await uploadToCloudflare(upEn.uploadURL, c.fileEn, (p) => setProgress({ label: labelEn, percent: p }))
          setProgress({ label: t("publicar.progress.processing", "Procesando vídeo en Cloudflare…"), percent: 100 })
          await waitForVideoReady(upEn.uid)
          uidEn = upEn.uid
        }
        // Los subtítulos no dependen del doblaje: se suben al vídeo español siempre y, si además
        // hay vídeo en inglés, también ahí — así se puede ver con cualquiera de los dos audios.
        if (c.captionsEn) {
          setProgress({ label: t("publicar.progress.captions", "Subiendo subtítulos…"), percent: 100 })
          const targets = [uploadCaptions(up.uid, c.captionsEn, publishToken)]
          if (uidEn) targets.push(uploadCaptions(uidEn, c.captionsEn, publishToken))
          await Promise.all(targets)
        }

        clipInputs.push({
          uid: up.uid,
          uidEn,
          title: c.title,
          titleEn: c.titleEn.trim() || undefined,
          description: c.description,
          descriptionEn: c.descriptionEn.trim() || undefined,
          durationSeconds: dur,
          blocks: c.groups
            .filter((g) => g.block && g.concepts.length > 0)
            .map((g) => ({ block: g.block, concepts: g.concepts })),
        })
      }

      // 3) Crear análisis + clips juntos
      setProgress({ label: t("publicar.progress.creating", "Creando contenido…"), percent: 100 })
      const translationsToSend = Object.fromEntries(
        Object.entries(conceptTranslations).filter(([, v]) => v.trim().length > 0),
      )
      await publish({
        analysis: {
          uid: aUp.uid,
          uidEn: aUidEn,
          title: aTitle,
          titleEn: aTitleEn.trim() || undefined,
          description: aDesc,
          descriptionEn: aDescEn.trim() || undefined,
          durationSeconds: aDur,
          players,
          venue: venue || undefined,
          category: category || undefined,
          round: round || undefined,
          year: year ? Number(year) : undefined,
          chapters: chapterInputs,
        },
        clips: clipInputs,
        conceptTranslations: Object.keys(translationsToSend).length > 0 ? translationsToSend : undefined,
      }, publishToken)

      setDone(
        t(
          "publicar.done",
          "¡Publicado! Análisis + {count} clip(s). Se están procesando en Cloudflare y estarán disponibles en unos minutos.",
          { count: clipInputs.length },
        ),
      )
      // Reset
      setStep(1)
      setAFile(null)
      setAFileEn(null)
      setACaptionsEn(null)
      setATitle("")
      setATitleEn("")
      setADesc("")
      setADescEn("")
      setPlayers([])
      setVenue("")
      setCategory("")
      setRound("")
      setYear("")
      setChapters([])
      setClips([emptyClip(blockNames[0] ?? "")])
      setConceptTranslations({})
      setImportText("")
      setImportError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("publicar.error.generic", "No se pudo publicar el contenido."))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{t("publicar.title", "Publicar contenido")}</h1>
        <p className="mt-2 text-sm text-white/60">{t("publicar.subtitle", "Un análisis y sus clips se publican juntos.")}</p>
      </div>

      <div className="flex items-center gap-4">
        <StepDot n={1} label={t("explorar.type.analyses", "Análisis")} active={step === 1} />
        <span className="h-px flex-1 bg-white/10" />
        <StepDot n={2} label={t("explorar.type.clips", "Clips")} active={step === 2} />
      </div>

      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" /> {done}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      {/* ---------- Paso 1: Análisis ---------- */}
      {step === 1 && (
        <div className="space-y-4">
          <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-white/70">
              {t("publicar.import.toggle", "¿Tienes el contenido preparado en un JSON? Impórtalo aquí")}
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-white/40">
                {t(
                  "publicar.import.hint",
                  "Pega el JSON con el análisis y sus clips. Rellena los campos de texto (título, descripción, jugadores, capítulos, bloques/conceptos); los vídeos se siguen adjuntando a mano.",
                )}
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{ "title": "...", "clips": [...] }'
                rows={6}
                className={`${inputCls} font-mono text-xs`}
              />
              {importError && <p className="text-xs text-amber-300">{importError}</p>}
              <button
                onClick={applyImport}
                className="rounded-lg border border-neon-cyan/40 px-4 py-2 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/10"
              >
                {t("publicar.import.apply", "Rellenar formulario")}
              </button>
            </div>
          </details>

          <FileDrop file={aFile} onFile={setAFile} label={t("publicar.field.analysis-video", "Vídeo del análisis completo")} />
          <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-white/70">{t("publicar.heygen-toggle", "¿Ya tienes el doblaje de HeyGen? Añádelo aquí")}</summary>
            <div className="mt-3 space-y-3">
              <FileDrop file={aFileEn} onFile={setAFileEn} label={t("publicar.field.en-video", "Vídeo en inglés (HeyGen)")} hint={t("common.optional", "Opcional")} />
              <FileDrop
                file={aCaptionsEn}
                onFile={setACaptionsEn}
                label={t("publicar.field.en-captions", "Subtítulos en inglés (.srt o .vtt)")}
                accept=".srt,.vtt,text/vtt,application/x-subrip"
                hint={t("publicar.captions-hint", "Se aplican al vídeo en español y, si lo subes, también al doblado en inglés")}
              />
            </div>
          </details>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder={t("publicar.field.analysis-title", "Título del análisis")} className={inputCls} />
            <input value={aTitleEn} onChange={(e) => setATitleEn(e.target.value)} placeholder={t("publicar.field.analysis-title-en", "Título en inglés (opcional)")} className={inputCls} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} placeholder={t("publicar.field.description", "Descripción")} rows={3} className={inputCls} />
            <textarea value={aDescEn} onChange={(e) => setADescEn(e.target.value)} placeholder={t("publicar.field.description-en", "Descripción en inglés (opcional)")} rows={3} className={inputCls} />
          </div>
          <div>
            <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.field.players", "Jugadores")}</span>
            <CatalogPicker type="player" multi selected={players} onChange={setPlayers} placeholder={t("publicar.field.players-placeholder", "Busca o crea un jugador…")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.field.venue", "Sede (ciudad)")}</span>
              <CatalogPicker type="venue" selected={venue ? [venue] : []} onChange={(v) => setVenue(v[0] ?? "")} placeholder={t("publicar.field.venue-placeholder", "Busca o crea una sede…")} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.field.category", "Categoría")}</span>
              <CatalogPicker type="category" selected={category ? [category] : []} onChange={(v) => setCategory(v[0] ?? "")} placeholder={t("publicar.field.category-placeholder", "Busca o crea una categoría…")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.field.round", "Ronda (opcional)")}</span>
              <select value={round} onChange={(e) => setRound(e.target.value)} className={inputCls}>
                <option value="" className="bg-midnight">—</option>
                {ROUND_CODES.map((r) => (
                  <option key={r} value={r} className="bg-midnight">{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.field.year", "Año")}</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-white/40">{t("publicar.inherit-hint", "Jugadores, sede, categoría, ronda y año se aplican también a todos los clips.")}</p>

          {/* Capítulos (opcional): momento (mm:ss) + título. §v1: minuto a mano. */}
          <div className="space-y-2">
            <span className="mb-1.5 block text-xs font-medium text-white/50">{t("publicar.chapters", "Capítulos (opcional)")}</span>
            {chapters.map((ch, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center">
                <input
                  value={ch.time}
                  onChange={(e) => updateChapter(i, { time: e.target.value })}
                  placeholder="mm:ss"
                  className={`${inputCls} sm:w-24 sm:shrink-0`}
                />
                <input
                  value={ch.title}
                  onChange={(e) => updateChapter(i, { title: e.target.value })}
                  placeholder={t("publicar.field.chapter-title", "Título del capítulo")}
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={ch.titleEn}
                  onChange={(e) => updateChapter(i, { titleEn: e.target.value })}
                  placeholder={t("publicar.field.chapter-title-en", "Título en inglés (opcional)")}
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={() => removeChapter(i)}
                  className="self-end text-white/40 transition hover:text-red-400 sm:self-center"
                  aria-label={t("publicar.remove-chapter", "Quitar capítulo")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={addChapter} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> {t("publicar.add-chapter", "Añadir capítulo")}
            </button>
          </div>

          <button onClick={goToClips} className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110">
            {t("publicar.next-clips", "Siguiente: clips")}
          </button>
        </div>
      )}

      {/* ---------- Paso 2: Clips ---------- */}
      {step === 2 && (
        <div className="space-y-6">
          {clips.map((clip, ci) => (
            <div key={ci} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">{t("publicar.clip-n", "Clip {n}", { n: ci + 1 })}</h3>
                {clips.length > 1 && (
                  <button onClick={() => setClips((cs) => cs.filter((_, i) => i !== ci))} className="text-white/40 transition hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <FileDrop file={clip.file} onFile={(f) => updateClip(ci, { file: f })} label={t("publicar.field.clip-video", "Vídeo del clip")} />
              <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-white/70">{t("publicar.heygen-toggle", "¿Ya tienes el doblaje de HeyGen? Añádelo aquí")}</summary>
                <div className="mt-3 space-y-3">
                  <FileDrop file={clip.fileEn} onFile={(f) => updateClip(ci, { fileEn: f })} label={t("publicar.field.en-video", "Vídeo en inglés (HeyGen)")} hint={t("common.optional", "Opcional")} />
                  <FileDrop
                    file={clip.captionsEn}
                    onFile={(f) => updateClip(ci, { captionsEn: f })}
                    label={t("publicar.field.en-captions", "Subtítulos en inglés (.srt o .vtt)")}
                    accept=".srt,.vtt,text/vtt,application/x-subrip"
                    hint={t("publicar.captions-hint", "Se aplican al vídeo en español y, si lo subes, también al doblado en inglés")}
                  />
                </div>
              </details>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input value={clip.title} onChange={(e) => updateClip(ci, { title: e.target.value })} placeholder={t("publicar.field.clip-title", "Título del clip")} className={inputCls} />
                <input value={clip.titleEn} onChange={(e) => updateClip(ci, { titleEn: e.target.value })} placeholder={t("publicar.field.clip-title-en", "Título en inglés (opcional)")} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <textarea value={clip.description} onChange={(e) => updateClip(ci, { description: e.target.value })} placeholder={t("publicar.field.clip-description", "Descripción del clip")} rows={2} className={inputCls} />
                <textarea value={clip.descriptionEn} onChange={(e) => updateClip(ci, { descriptionEn: e.target.value })} placeholder={t("publicar.field.clip-description-en", "Descripción en inglés (opcional)")} rows={2} className={inputCls} />
              </div>

              {/* Grupos bloque → conceptos (un bloque puede tener varios conceptos) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50">{t("publicar.blocks-and-concepts", "Bloques y conceptos")}</p>
                {clip.groups.map((g, gi) => (
                  <div key={gi} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={g.block}
                        onChange={(e) => updateGroup(ci, gi, { block: e.target.value })}
                        className={`${inputCls} flex-1`}
                      >
                        {blockNames.map((b) => (
                          <option key={b} value={b} className="bg-midnight">{b}</option>
                        ))}
                      </select>
                      {clip.groups.length > 1 && (
                        <button onClick={() => removeGroup(ci, gi)} className="shrink-0 text-white/40 transition hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <CatalogPicker
                      type="concept"
                      multi
                      block={g.block}
                      selected={g.concepts}
                      onChange={(v) => updateGroup(ci, gi, { concepts: v })}
                      placeholder={t("publicar.field.concept-placeholder", "Busca o crea un concepto…")}
                      extraSuggestions={conceptsForBlock(g.block)}
                    />
                  </div>
                ))}
                <button onClick={() => addGroup(ci)} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" /> {t("publicar.add-block", "Añadir bloque")}
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setClips((cs) => [...cs, emptyClip(blockNames[0] ?? "")])}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-3 text-sm font-medium text-white/70 transition hover:border-neon-cyan/40 hover:text-white"
          >
            <Plus className="h-4 w-4" /> {t("publicar.add-clip", "Añadir otro clip")}
          </button>

          <ConceptTranslationPanel
            selectedConcepts={allSelectedConcepts}
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

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} disabled={busy} className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60">
              {t("publicar.back", "Atrás")}
            </button>
            <button onClick={publishAll} disabled={busy} className="flex-1 rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60">
              {busy ? t("publicar.publishing", "Publicando…") : t("publicar.publish-cta", "Publicar análisis + clips")}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Publicar
