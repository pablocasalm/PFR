import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle2, Plus, X } from "lucide-react"
import {
  getClipForEdit,
  getAnalysisForEdit,
  patchClip,
  patchAnalysis,
  type BlockConceptsInput,
} from "../../../lib/api/admin"
import CatalogPicker from "../components/CatalogPicker"

/**
 * Editar — v1 básica de edición de contenido ya publicado (título, descripción, jugadores,
 * y para clips también bloques/conceptos). No permite reasignar a qué análisis "aparece"
 * un clip ni tocar el vídeo — eso queda para la fase de "Estudio" (ver memoria del
 * proyecto). Reutiliza los mismos campos/patrones que Publicar.tsx.
 */

const BLOCKS = [
  "Juego desde el fondo",
  "Transición defensa-ataque",
  "Juego en la red",
  "Uso del globo",
  "Gestión del ritmo del punto",
  "Situaciones de presión",
  "Lectura táctica del rival",
  "Uso táctico de golpes",
  "Juego en pareja",
]

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

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [players, setPlayers] = useState<string[]>([])
  // Solo clips
  const [groups, setGroups] = useState<Group[]>([{ block: BLOCKS[0], concepts: [] }])
  // Solo análisis
  const [venue, setVenue] = useState("")
  const [category, setCategory] = useState("")
  const [round, setRound] = useState("")
  const [year, setYear] = useState("")

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

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
          setGroups(data.blocks.length > 0 ? data.blocks.map((b) => ({ block: b.block, concepts: b.concepts })) : [{ block: BLOCKS[0], concepts: [] }])
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
  const addGroup = () => setGroups((gs) => [...gs, { block: BLOCKS[0], concepts: [] }])
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
                    {BLOCKS.map((b) => (
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
    </main>
  )
}

export default Editar
