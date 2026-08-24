import { useEffect, useRef, useState } from "react"
import { Bell, ChevronDown, History } from "lucide-react"
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
  const [readOpen, setReadOpen] = useState(false)
  // Ids que ya estaban leídas ANTES de abrir la campana — se guarda aparte porque al abrir se
  // marca todo como leído al momento, y si no, las recién leídas desaparecerían de la vista antes
  // de que el usuario llegara a verlas.
  const [alreadyReadIds, setAlreadyReadIds] = useState<Set<number>>(new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // El header tiene backdrop-blur, y eso convierte a `fixed` en descendientes en algo anclado al
    // propio header (no al viewport) — un `fixed inset-0` para detectar clics fuera no cubriría el
    // resto de la página. Por eso el cierre al clicar fuera se hace con un listener real, no con una
    // capa superpuesta.
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  useEffect(() => {
    getNews()
      .then((res) => {
        setItems(res.items)
        setUnreadCount(res.unreadCount)
        setAlreadyReadIds(new Set(res.items.filter((i) => i.isRead).map((i) => i.id)))
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
    <div className="relative" ref={rootRef}>
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
          {/* En móvil, `right-0` relativo al propio botón desborda por la izquierda porque el avatar
              queda a su derecha (el panel no está pegado al borde de la pantalla) — por eso se ancla
              al viewport con `fixed` hasta `sm`, donde ya sobra espacio para el `absolute right-0`. */}
          <div className="fixed inset-x-3 top-16 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-midnight p-2 shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-80">
            <p className="border-b border-white/10 px-3 py-2 text-sm font-semibold text-white">Noticias</p>
            {!loaded ? (
              <p className="px-3 py-6 text-center text-sm text-white/40">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-white/40">Todavía no hay noticias.</p>
            ) : (
              <>
                {(() => {
                  const fresh = items.filter((n) => !alreadyReadIds.has(n.id))
                  const old = items.filter((n) => alreadyReadIds.has(n.id))
                  return (
                    <>
                      {fresh.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {fresh.map((n) => (
                            <div key={n.id} className="rounded-lg px-3 py-2.5 transition hover:bg-white/5">
                              <p className="text-sm font-semibold text-white">{n.title}</p>
                              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/60">{n.body}</p>
                              <p className="mt-1.5 text-[11px] text-white/35">{fmt(n.createdAtUtc)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="px-3 py-6 text-center text-sm text-white/40">No hay noticias nuevas.</p>
                      )}

                      {old.length > 0 && (
                        <div className="mt-1 border-t border-white/10 pt-1">
                          <button
                            onClick={() => setReadOpen((v) => !v)}
                            aria-expanded={readOpen}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white/50 transition hover:text-white/80"
                          >
                            <History className="h-3.5 w-3.5" />
                            Leídas anteriormente ({old.length})
                            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform ${readOpen ? "rotate-180" : ""}`} />
                          </button>

                          {readOpen && (
                            <div className="space-y-1">
                              {old.map((n) => (
                                <div key={n.id} className="rounded-lg px-3 py-2.5 opacity-60 transition hover:bg-white/5 hover:opacity-100">
                                  <p className="text-sm font-semibold text-white">{n.title}</p>
                                  <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-white/60">{n.body}</p>
                                  <p className="mt-1.5 text-[11px] text-white/35">{fmt(n.createdAtUtc)}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NewsBell
