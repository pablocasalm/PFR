import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { getNews, markAllNewsRead, type NewsItem } from "../../../lib/api/news"

/** "Hace X" relativo, mismo criterio que el backend usa para comentarios (Ago en ContentMapper). */
const fmt = (iso: string) => {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return ""
  const diffMin = (Date.now() - d.getTime()) / 60000
  if (diffMin < 1) return "Justo ahora"
  if (diffMin < 60) return `Hace ${Math.floor(diffMin)} min`
  if (diffMin < 60 * 24) return `Hace ${Math.floor(diffMin / 60)} h`
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

/** Campana de noticias en el header: contador de no leídas + panel desplegable. */
const NewsBell = () => {
  const [items, setItems] = useState<NewsItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    getNews()
      .then((res) => {
        setItems(res.items)
        setUnreadCount(res.unreadCount)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const toggle = () => {
    const next = !open
    setOpen(next)
    // Al abrir el panel, se marca todo como leído (mismo comportamiento que una campana de
    // notificaciones normal) — optimista: se limpia ya mismo, sin esperar al backend.
    if (next && unreadCount > 0) {
      setUnreadCount(0)
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })))
      markAllNewsRead().catch(() => {})
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Noticias"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl">
            <p className="border-b border-white/10 px-3 py-2 text-sm font-semibold text-white">Noticias</p>
            {!loaded ? (
              <p className="px-3 py-6 text-center text-sm text-white/40">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-white/40">Todavía no hay noticias.</p>
            ) : (
              <div className="mt-1 space-y-1">
                {items.map((n) => (
                  <div key={n.id} className="rounded-lg px-3 py-2.5 transition hover:bg-white/5">
                    <p className="text-sm font-semibold text-white">{n.title}</p>
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/60">{n.body}</p>
                    <p className="mt-1.5 text-[11px] text-white/35">{fmt(n.createdAtUtc)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NewsBell
