import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, X, Clock } from "lucide-react"
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "../../../lib/search/recent"

/**
 * Overlay de búsqueda — solo móvil (xl:hidden; en escritorio ya hay un campo siempre visible
 * junto al avatar). Pantalla oscura propia con "modo búsqueda": aterriza en /app/search solo
 * al enviar una consulta, no mientras se está escribiendo. Muestra búsquedas recientes
 * (guardadas solo en este dispositivo, sin sincronizar entre dispositivos por ahora).
 */
const SearchOverlay = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setRecent(getRecentSearches())
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  const runSearch = (text: string) => {
    const q = text.trim()
    if (!q) return
    addRecentSearch(q)
    onClose()
    navigate(`/app/search?q=${encodeURIComponent(q)}`)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-midnight xl:hidden" role="dialog" aria-modal="true">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Search className="h-5 w-5 shrink-0 text-white/40" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
          placeholder="Buscar clips, conceptos, jugadores..."
          className="flex-1 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
        />
        <button onClick={onClose} aria-label="Cerrar búsqueda" className="shrink-0 text-white/60 transition hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {recent.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wide text-white/50">Búsquedas recientes</h2>
              <button
                onClick={() => {
                  clearRecentSearches()
                  setRecent([])
                }}
                className="text-xs font-medium text-white/40 transition hover:text-white"
              >
                Borrar
              </button>
            </div>
            <ul className="space-y-0.5">
              {recent.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => runSearch(q)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="truncate">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-white/40">Escribe para buscar clips, conceptos, jugadores o análisis.</p>
        )}
      </div>
    </div>
  )
}

export default SearchOverlay
