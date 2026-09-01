import { useState } from "react"
import { UploadCloud, Film, Plus, Trash2, X, CheckCircle2 } from "lucide-react"
import { createDirectUpload, uploadToCloudflare, readVideoDuration, publish, type PublishChapterInput } from "../../../lib/api/admin"
import { getBlocks } from "../../../lib/api/blocks"
import { useApi } from "../../../lib/hooks/useApi"
import CatalogPicker from "../components/CatalogPicker"

/**
 * Publicar — Wizard de creación de contenido (§ proceso de publicación). Solo ContentCreator/Admin.
 * Paso 1: análisis (vídeo largo + torneo + jugadores). Paso 2: clips (cada uno con su vídeo y
 * grupos bloque→conceptos). Torneo/jugadores se heredan del análisis en los clips.
 */

const ROUNDS = [
  "Treintaidosavos de final",
  "Dieciseisavos de final",
  "Octavos de final",
  "Cuartos de final",
  "Semifinales",
  "Final",
]

type Group = { block: string; concepts: string[] }
type ClipDraft = { file: File | null; title: string; description: string; groups: Group[] }
type ChapterDraft = { time: string; title: string; concept: string }

const emptyClip = (defaultBlock: string): ClipDraft => ({ file: null, title: "", description: "", groups: [{ block: defaultBlock, concepts: [] }] })
const emptyChapter = (): ChapterDraft => ({ time: "", title: "", concept: "" })

/** "mm:ss" o "hh:mm:ss" (solo dígitos y ":") → segundos. null si el formato no es válido. */
const parseTimeToSeconds = (text: string): number | null => {
  const parts = text.trim().split(":").map((p) => p.trim())
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === "" || !/^\d+$/.test(p))) return null
  return parts.map(Number).reduce((acc, n) => acc * 60 + n, 0)
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

const FileDrop = ({ file, onFile, label }: { file: File | null; onFile: (f: File | null) => void; label: string }) => (
  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-center transition hover:border-neon-cyan/40">
    {file ? (
      <>
        <Film className="h-6 w-6 text-neon-cyan" />
        <span className="text-sm font-medium text-white">{file.name}</span>
        <span className="text-xs text-white/40">{(file.size / 1_000_000).toFixed(1)} MB</span>
      </>
    ) : (
      <>
        <UploadCloud className="h-6 w-6 text-white/50" />
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="text-xs text-white/40">MP4, MOV…</span>
      </>
    )}
    <input type="file" accept="video/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
  </label>
)

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
  const { data: blocksData } = useApi(getBlocks, [], "blocks")
  const blocks = blocksData ?? []

  const [step, setStep] = useState<1 | 2>(1)

  // Análisis
  const [aFile, setAFile] = useState<File | null>(null)
  const [aTitle, setATitle] = useState("")
  const [aDesc, setADesc] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  const [venue, setVenue] = useState("")
  const [category, setCategory] = useState("")
  const [round, setRound] = useState("")
  const [year, setYear] = useState("")
  const [chapters, setChapters] = useState<ChapterDraft[]>([])

  // Clips
  const [clips, setClips] = useState<ClipDraft[]>([emptyClip(blocks[0] ?? "")])

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ label: string; percent: number } | null>(null)

  const updateClip = (i: number, patch: Partial<ClipDraft>) =>
    setClips((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))

  const updateGroup = (ci: number, gi: number, patch: Partial<Group>) =>
    setClips((cs) =>
      cs.map((c, idx) =>
        idx === ci ? { ...c, groups: c.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)) } : c,
      ),
    )

  const addGroup = (ci: number) =>
    setClips((cs) => cs.map((c, idx) => (idx === ci ? { ...c, groups: [...c.groups, { block: blocks[0] ?? "", concepts: [] }] } : c)))

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

  const updateChapter = (i: number, patch: Partial<ChapterDraft>) =>
    setChapters((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const addChapter = () => setChapters((cs) => [...cs, emptyChapter()])
  const removeChapter = (i: number) => setChapters((cs) => cs.filter((_, idx) => idx !== i))

  const goToClips = () => {
    setError(null)
    if (!aFile) return setError("Sube el vídeo del análisis.")
    if (!aTitle.trim()) return setError("El análisis necesita un título.")
    setStep(2)
  }

  const publishAll = async () => {
    setError(null)
    setDone(null)
    const validClips = clips.filter((c) => c.file && c.title.trim())
    if (validClips.length === 0) return setError("Añade al menos un clip con vídeo y título.")

    const chapterInputs: PublishChapterInput[] = []
    for (const ch of chapters) {
      if (!ch.title.trim()) continue
      const startSeconds = parseTimeToSeconds(ch.time)
      if (startSeconds === null) return setError(`Formato de tiempo inválido en el capítulo "${ch.title.trim()}" (usa mm:ss).`)
      chapterInputs.push({ startSeconds, title: ch.title.trim(), concept: ch.concept.trim() || undefined })
    }

    setBusy(true)
    setProgress({ label: "Subiendo análisis…", percent: 0 })
    try {
      // 1) Subir el vídeo del análisis
      const aDur = await readVideoDuration(aFile!)
      const aUp = await createDirectUpload(aTitle || aFile!.name, aFile!.size)
      await uploadToCloudflare(aUp.uploadURL, aFile!, (p) => setProgress({ label: "Subiendo análisis…", percent: p }))

      // 2) Subir cada clip
      const clipInputs = []
      for (let i = 0; i < validClips.length; i++) {
        const c = validClips[i]
        const label = `Subiendo clip ${i + 1} de ${validClips.length}…`
        setProgress({ label, percent: 0 })
        const dur = await readVideoDuration(c.file!)
        const up = await createDirectUpload(c.title || c.file!.name, c.file!.size)
        await uploadToCloudflare(up.uploadURL, c.file!, (p) => setProgress({ label, percent: p }))
        clipInputs.push({
          uid: up.uid,
          title: c.title,
          description: c.description,
          durationSeconds: dur,
          blocks: c.groups
            .filter((g) => g.block && g.concepts.length > 0)
            .map((g) => ({ block: g.block, concepts: g.concepts })),
        })
      }

      // 3) Crear análisis + clips juntos
      setProgress({ label: "Creando contenido…", percent: 100 })
      await publish({
        analysis: {
          uid: aUp.uid,
          title: aTitle,
          description: aDesc,
          durationSeconds: aDur,
          players,
          venue: venue || undefined,
          category: category || undefined,
          round: round || undefined,
          year: year ? Number(year) : undefined,
          chapters: chapterInputs,
        },
        clips: clipInputs,
      })

      setDone(`¡Publicado! Análisis + ${clipInputs.length} clip(s). Se están procesando en Cloudflare y estarán disponibles en unos minutos.`)
      // Reset
      setStep(1)
      setAFile(null)
      setATitle("")
      setADesc("")
      setPlayers([])
      setVenue("")
      setCategory("")
      setRound("")
      setYear("")
      setChapters([])
      setClips([emptyClip(blocks[0] ?? "")])
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar el contenido.")
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Publicar contenido</h1>
        <p className="mt-2 text-sm text-white/60">Un análisis y sus clips se publican juntos.</p>
      </div>

      <div className="flex items-center gap-4">
        <StepDot n={1} label="Análisis" active={step === 1} />
        <span className="h-px flex-1 bg-white/10" />
        <StepDot n={2} label="Clips" active={step === 2} />
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
          <FileDrop file={aFile} onFile={setAFile} label="Vídeo del análisis completo" />
          <input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Título del análisis" className={inputCls} />
          <textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} placeholder="Descripción" rows={3} className={inputCls} />
          <div>
            <span className="mb-1.5 block text-xs font-medium text-white/50">Jugadores</span>
            <CatalogPicker type="player" multi selected={players} onChange={setPlayers} placeholder="Busca o crea un jugador…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/50">Sede (ciudad)</span>
              <CatalogPicker type="venue" selected={venue ? [venue] : []} onChange={(v) => setVenue(v[0] ?? "")} placeholder="Busca o crea una sede…" />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-white/50">Categoría</span>
              <CatalogPicker type="category" selected={category ? [category] : []} onChange={(v) => setCategory(v[0] ?? "")} placeholder="Busca o crea una categoría…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/50">Ronda (opcional)</span>
              <select value={round} onChange={(e) => setRound(e.target.value)} className={inputCls}>
                <option value="" className="bg-midnight">—</option>
                {ROUNDS.map((r) => (
                  <option key={r} value={r} className="bg-midnight">{r}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/50">Año</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" className={inputCls} />
            </label>
          </div>
          <p className="text-xs text-white/40">Jugadores, sede, categoría, ronda y año se aplican también a todos los clips.</p>

          {/* Capítulos (opcional): momento (mm:ss) + título + concepto opcional. §v1: minuto a mano. */}
          <div className="space-y-2">
            <span className="mb-1.5 block text-xs font-medium text-white/50">Capítulos (opcional)</span>
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
                  placeholder="Título del capítulo"
                  className={`${inputCls} flex-1`}
                />
                <input
                  value={ch.concept}
                  onChange={(e) => updateChapter(i, { concept: e.target.value })}
                  placeholder="Concepto (opcional)"
                  className={`${inputCls} sm:w-40 sm:shrink-0`}
                />
                <button
                  onClick={() => removeChapter(i)}
                  className="self-end text-white/40 transition hover:text-red-400 sm:self-center"
                  aria-label="Quitar capítulo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={addChapter} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> Añadir capítulo
            </button>
          </div>

          <button onClick={goToClips} className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110">
            Siguiente: clips
          </button>
        </div>
      )}

      {/* ---------- Paso 2: Clips ---------- */}
      {step === 2 && (
        <div className="space-y-6">
          {clips.map((clip, ci) => (
            <div key={ci} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Clip {ci + 1}</h3>
                {clips.length > 1 && (
                  <button onClick={() => setClips((cs) => cs.filter((_, i) => i !== ci))} className="text-white/40 transition hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <FileDrop file={clip.file} onFile={(f) => updateClip(ci, { file: f })} label="Vídeo del clip" />
              <input value={clip.title} onChange={(e) => updateClip(ci, { title: e.target.value })} placeholder="Título del clip" className={inputCls} />
              <textarea value={clip.description} onChange={(e) => updateClip(ci, { description: e.target.value })} placeholder="Descripción del clip" rows={2} className={inputCls} />

              {/* Grupos bloque → conceptos (un bloque puede tener varios conceptos) */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50">Bloques y conceptos</p>
                {clip.groups.map((g, gi) => (
                  <div key={gi} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={g.block}
                        onChange={(e) => updateGroup(ci, gi, { block: e.target.value })}
                        className={`${inputCls} flex-1`}
                      >
                        {blocks.map((b) => (
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
                      placeholder="Busca o crea un concepto…"
                      extraSuggestions={conceptsForBlock(g.block)}
                    />
                  </div>
                ))}
                <button onClick={() => addGroup(ci)} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" /> Añadir bloque
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setClips((cs) => [...cs, emptyClip(blocks[0] ?? "")])}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-3 text-sm font-medium text-white/70 transition hover:border-neon-cyan/40 hover:text-white"
          >
            <Plus className="h-4 w-4" /> Añadir otro clip
          </button>

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
              Atrás
            </button>
            <button onClick={publishAll} disabled={busy} className="flex-1 rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60">
              {busy ? "Publicando…" : "Publicar análisis + clips"}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default Publicar
