const KEY = "pfr_recent_searches"
const MAX = 8

/**
 * Búsquedas recientes del overlay de búsqueda (móvil). Solo local (localStorage), sin
 * sincronizar entre dispositivos — decisión explícita para esta v1, ver memoria del proyecto.
 */
export const getRecentSearches = (): string[] => {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const addRecentSearch = (query: string) => {
  const q = query.trim()
  if (!q) return
  const rest = getRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase())
  localStorage.setItem(KEY, JSON.stringify([q, ...rest].slice(0, MAX)))
}

export const clearRecentSearches = () => {
  localStorage.removeItem(KEY)
}
