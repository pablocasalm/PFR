import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle2, Plus, X } from "lucide-react"
import {
  getClipForEdit,
  getAnalysisForEdit,
  patchClip,
  patchAnalysis,
  createDirectUpload,
  uploadToCloudflare,
  setClipVideoEn,
  setAnalysisVideoEn,
  uploadCaptions,
  type BlockConceptsInput,
} from "../../../lib/api/admin"
import { getBlocks } from "../../../lib/api/blocks"
import { useApi } from "../../../lib/hooks/useApi"
import CatalogPicker from "../components/CatalogPicker"
import FileDrop from "../components/FileDrop"

/**
 * Editar — v1 básica de edición de contenido ya publicado (título, descripción, jugadores,
 * y para clips también bloques/conceptos). No permite reasignar a qué análisis "aparece"
 * un clip ni tocar el vídeo — eso queda para la fase de "Estudio" (ver memoria del
 * proyecto). Reutiliza los mismos campos/patrones que Publicar.tsx.
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

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"

const Editar = () => {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const isClip = type === "clip"
  const { data: blocksData } = useApi(getBlocks, [], "blocks")
  const blocks = blocksData ?? []

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  // Solo clips
  const [groups, setGroups] = useState<Group[]>([{ block: "", concepts: [] }])
  // Solo análisis
  const [venue, setVenue] = useState("")
  const [category, setCategory] = useState("")
  const [round, setRound] = useState("")
  const [year, setYear] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Versión en inglés (HeyGen): vídeo doblado + subtítulos, independiente del guardado de metadatos.
  const [streamUidEn, setStreamUidEn] = useState<string | null>(null)
  const hasVideoEn = streamUidEn != null
  const [enFile, setEnFile] = useState<File | null>(null)
  const [enCaptionsFile, setEnCaptionsFile] = useState<File | null>(null)
  const [enBusy, setEnBusy] = useState(false)
  const [enProgress, setEnProgress] = useState<{ label: string; percent: number } | null>(null)
  const [enError, setEnError] = useState<string | null>(null)
  const [enDone, setEnDone] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    ;(async () => {
      try {
        if (isClip) {
          const data = await getClipForEdit(id)
          if (!active) return
          setTitle(data.title)
          setDescription(data.description)
          setPlayers(data.players)
          setGroups(data.blocks.length > 0 ? data.blocks.map((b) => ({ block: b.block, concepts: b.concepts })) : [{ block: blocks[0] ?? "", concepts: [] }])
          setStreamUidEn(data.streamUidEn)
        } else {
          const data = await getAnalysisForEdit(id)
          if (!active) return
          setTitle(data.title)
          setDescription(data.description)
          setPlayers(data.players)
          setVenue(data.venue ?? "")
          setCategory(data.category ?? "")
          setRound(data.round ?? "")
          setYear(data.year != null ? String(data.year) : "")
          setStreamUidEn(data.streamUidEn)
        }
      } catch (e) {
        if (active) setLoadError(e instanceof Error ? e.message : "No se pudo cargar el contenido.")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id, isClip])

  const updateGroup = (gi: number, patch: Partial<Group>) =>
    setGroups((gs) => gs.map((g, j) => (j === gi ? { ...g, ...patch } : g)))
  const addGroup = () => setGroups((gs) => [...gs, { block: blocks[0] ?? "", concepts: [] }])
  const removeGroup = (gi: number) => setGroups((gs) => gs.filter((_, j) => j !== gi))

  // Mismo motivo que en Publicar.tsx: sugerir en el picker los conceptos ya escritos en
  // otros grupos de este mismo bloque, aunque todavía no se hayan guardado.
  const conceptsForBlock = (block: string) => {
    const set = new Set<string>()
    for (const g of groups) if (g.block === block) for (const concept of g.concepts) set.add(concept)
    return Array.from(set)
  }

  const save = async () => {
    setError(null)
    if (!title.trim()) return setError("El título es obligatorio.")
    if (!id) return

    setSaving(true)
    try {
      if (isClip) {
        const blocks: BlockConceptsInput[] = groups
          .filter((g) => g.block && g.concepts.length > 0)
          .map((g) => ({ block: g.block, concepts: g.concepts }))
        await patchClip(id, { title: title.trim(), description, players, blocks })
      } else {
        await patchAnalysis(id, {
          title: title.trim(),
          description,
          players,
          venue: venue || undefined,
          category: category || undefined,
          round: round || undefined,
          year: year ? Number(year) : undefined,
        })
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  const saveEnglish = async () => {
    setEnError(null)
    setEnDone(null)
    if (!id) return
    if (!enFile && !enCaptionsFile) return setEnError("Sube un vídeo o unos subtítulos primero.")
    if (!enFile && enCaptionsFile && !hasVideoEn) return setEnError("Sube antes el vídeo en inglés.")

    setEnBusy(true)
    try {
      // El uid para los subtítulos sale del vídeo recién subido en esta misma acción si lo hay;
      // si no, del que ya existiera de antes — en ningún caso hace falta releer nada del backend.
      let uidForCaptions = streamUidEn

      if (enFile) {
        setEnProgress({ label: "Subiendo vídeo en inglés…", percent: 0 })
        const up = await createDirectUpload(`${title || "video"} (EN)`, enFile.size)
        await uploadToCloudflare(up.uploadURL, enFile, (p) => setEnProgress({ label: "Subiendo vídeo en inglés…", percent: p }))
        if (isClip) await setClipVideoEn(id, up.uid)
        else await setAnalysisVideoEn(id, up.uid)
        setStreamUidEn(up.uid)
        uidForCaptions = up.uid
      }

      if (enCaptionsFile && uidForCaptions) {
        setEnProgress({ label: "Subiendo subtítulos…", percent: 100 })
        await uploadCaptions(uidForCaptions, enCaptionsFile)
      }

      setEnDone("Versión en inglés actualizada. Cloudflare tarda unos minutos en procesar el vídeo nuevo.")
      setEnFile(null)
      setEnCaptionsFile(null)
    } catch (e) {
      setEnError(e instanceof Error ? e.message : "No se pudo subir la versión en inglés.")
    } finally {
      setEnBusy(false)
      setEnProgress(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl py-8">
        <p className="text-sm text-white/40">Cargando…</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-2xl py-8">
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{loadError}</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Editar {isClip ? "clip" : "análisis"}
        </h1>
        <p className="mt-2 text-sm text-white/60">Cambia lo que haga falta y guarda.</p>
      </div>

      {done && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Guardado.
          <button onClick={() => navigate(-1)} className="ml-auto font-semibold underline underline-offset-2">
            Volver
          </button>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className={inputCls} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          className={inputCls}
        />
        <div>
          <span className="mb-1.5 block text-xs font-medium text-white/50">Jugadores</span>
          <CatalogPicker type="player" multi selected={players} onChange={setPlayers} placeholder="Busca o crea un jugador…" />
        </div>

        {isClip ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-white/50">Bloques y conceptos</p>
            {groups.map((g, gi) => (
              <div key={gi} className="space-y-2 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-2">
                  <select
                    value={g.block}
                    onChange={(e) => updateGroup(gi, { block: e.target.value })}
                    className={`${inputCls} flex-1`}
                  >
                    {blocks.map((b) => (
                      <option key={b} value={b} className="bg-midnight">{b}</option>
                    ))}
                  </select>
                  {groups.length > 1 && (
                    <button onClick={() => removeGroup(gi)} className="shrink-0 text-white/40 transition hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <CatalogPicker
                  type="concept"
                  multi
                  block={g.block}
                  selected={g.concepts}
                  onChange={(v) => updateGroup(gi, { concepts: v })}
                  placeholder="Busca o crea un concepto…"
                  extraSuggestions={conceptsForBlock(g.block)}
                />
              </div>
            ))}
            <button onClick={addGroup} className="flex items-center gap-1.5 text-xs font-medium text-neon-cyan transition hover:brightness-110">
              <Plus className="h-3.5 w-3.5" /> Añadir bloque
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            disabled={saving}
            className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Versión en inglés (HeyGen) — guardado independiente del de metadatos. */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/70">Versión en inglés (HeyGen)</h2>
          <p className="mt-1 text-xs text-white/50">
            Sube aquí el MP4 que descargas de HeyGen (Hyperrealistic Translation) para este {isClip ? "clip" : "análisis"}.
          </p>
        </div>

        <FileDrop file={enFile} onFile={setEnFile} label={hasVideoEn ? "Reemplazar vídeo en inglés" : "Subir vídeo en inglés"} hint="MP4, MOV…" />

        <div>
          <FileDrop
            file={enCaptionsFile}
            onFile={setEnCaptionsFile}
            label="Subtítulos en inglés (.srt o .vtt)"
            accept=".srt,.vtt,text/vtt,application/x-subrip"
            hint={hasVideoEn || enFile ? "Opcional" : "Sube antes el vídeo en inglés"}
          />
        </div>

        {enError && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{enError}</p>}
        {enDone && <p className="rounded-lg bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">{enDone}</p>}
        {enProgress && (
          <div>
            <p className="mb-1 text-xs text-white/50">{enProgress.label}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-neon-cyan transition-all" style={{ width: `${enProgress.percent}%` }} />
            </div>
          </div>
        )}

        <button
          onClick={saveEnglish}
          disabled={enBusy || (!enFile && !enCaptionsFile)}
          className="rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-5 py-2.5 text-sm font-bold text-neon-cyan transition hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enBusy ? "Subiendo…" : "Guardar versión en inglés"}
        </button>
      </div>
    </main>
  )
}

export default Editar
