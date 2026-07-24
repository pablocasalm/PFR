import { useState } from "react"
import { UploadCloud, Film } from "lucide-react"

/**
 * Publicar — Página de creación de contenido (§14.5/14.6). Solo accesible para
 * ContentCreator/Admin (protegida por RequirePublisher en el router).
 *
 * El formulario de metadatos está completo; la SUBIDA a Cloudflare Stream se conecta
 * en el siguiente paso (Direct Creator Upload contra los endpoints admin del backend).
 */

const BLOCKS = [
  "Juego desde el fondo",
  "Transición defensa-ataque",
  "Juego en la red",
  "Uso del globo",
  "Gestión del ritmo",
  "Situaciones de presión",
  "Lectura del rival",
  "Uso táctico de golpes",
  "Juego en pareja",
]

const LEVELS = ["Intermedio", "Avanzado"]

type ContentType = "clip" | "analysis"

const Publicar = () => {
  const [type, setType] = useState<ContentType>("clip")
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [block, setBlock] = useState(BLOCKS[0])
  const [concepts, setConcepts] = useState("")
  const [level, setLevel] = useState(LEVELS[0])
  const [players, setPlayers] = useState("")
  const [tournament, setTournament] = useState("")
  const [notice, setNotice] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setNotice("Selecciona un archivo de vídeo.")
      return
    }
    // TODO (siguiente paso): Direct Creator Upload contra el backend:
    //   1) POST /api/admin/videos/direct-upload → { uploadURL, uid }
    //   2) subir `file` a uploadURL (tus)
    //   3) POST /api/admin/{clips|analyses} con { uid, title, description, block, concepts[], level, players, tournament }
    setNotice("Formulario listo. La subida a Cloudflare Stream se conecta en el siguiente paso.")
  }

  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="font-display text-4xl font-bold text-white">Publicar contenido</h1>
        <p className="mt-2 text-sm text-white/60">Sube un clip o un análisis y completa sus metadatos.</p>
      </div>

      {/* Tipo de contenido */}
      <div className="flex gap-2">
        {(["clip", "analysis"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
              type === t
                ? "border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {t === "clip" ? "Clip" : "Análisis completo"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* Archivo */}
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-10 text-center transition hover:border-neon-cyan/40">
          {file ? (
            <>
              <Film className="h-7 w-7 text-neon-cyan" />
              <span className="text-sm font-medium text-white">{file.name}</span>
              <span className="text-xs text-white/40">{(file.size / 1_000_000).toFixed(1)} MB</span>
            </>
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-white/50" />
              <span className="text-sm font-medium text-white/80">Arrastra o selecciona el vídeo</span>
              <span className="text-xs text-white/40">MP4, MOV…</span>
            </>
          )}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" required className={inputCls} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción corta"
          rows={3}
          className={inputCls}
        />

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/50">Bloque táctico</span>
            <select value={block} onChange={(e) => setBlock(e.target.value)} className={inputCls}>
              {BLOCKS.map((b) => (
                <option key={b} value={b} className="bg-midnight">
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/50">Nivel</span>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
              {LEVELS.map((l) => (
                <option key={l} value={l} className="bg-midnight">
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>

        <input
          value={concepts}
          onChange={(e) => setConcepts(e.target.value)}
          placeholder="Conceptos (separados por comas): Globo, Paciencia, Subir"
          className={inputCls}
        />

        <div className="grid grid-cols-2 gap-4">
          <input value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="Jugadores" className={inputCls} />
          <input value={tournament} onChange={(e) => setTournament(e.target.value)} placeholder="Torneo" className={inputCls} />
        </div>

        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110"
        >
          Publicar
        </button>
      </form>
    </main>
  )
}

export default Publicar
