import { useEffect, useState } from "react"
import { Megaphone, Trash2 } from "lucide-react"
import { listAllNews, createNews, deleteNews, type AdminNewsItem } from "../../../lib/api/news"

/**
 * AdminNoticias — publica y gestiona las noticias que ven todos los usuarios en la campana
 * del header (solo Admin).
 */

const fmt = (iso: string): string => {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const AdminNoticias = () => {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [items, setItems] = useState<AdminNewsItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      setItems(await listAllNews())
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las noticias.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const submit = async () => {
    if (!title.trim() || !body.trim() || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      await createNews(title.trim(), body.trim())
      setNotice("Noticia publicada.")
      setTitle("")
      setBody("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar la noticia.")
    } finally {
      setSending(false)
    }
  }

  const remove = async (n: AdminNewsItem) => {
    if (!window.confirm(`¿Borrar la noticia "${n.title}"?`)) return
    try {
      await deleteNews(n.id)
      setItems((prev) => prev.filter((x) => x.id !== n.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar la noticia.")
    }
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Megaphone className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Noticias</h1>
          <p className="text-sm text-white/60">Publica novedades y arreglos — las ve todo el mundo en la campana.</p>
        </div>
      </div>

      {/* Publicar */}
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Nuevo filtro de jugadores"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-white">Contenido</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Qué ha cambiado o se ha arreglado..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}

        <button
          onClick={submit}
          disabled={!title.trim() || !body.trim() || sending}
          className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Publicando..." : "Publicar"}
        </button>
      </div>

      {/* Lista */}
      <div className="mt-10 max-w-2xl">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/70">
          Publicadas {!loading && `(${items.length})`}
        </h2>

        {loading ? (
          <p className="text-sm text-white/40">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40">Todavía no has publicado ninguna noticia.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/60">{n.body}</p>
                    <p className="mt-1.5 text-xs text-white/40">{fmt(n.createdAtUtc)}</p>
                  </div>
                  <button
                    onClick={() => remove(n)}
                    aria-label={`Borrar noticia "${n.title}"`}
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

export default AdminNoticias
