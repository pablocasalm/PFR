import { useSyncExternalStore } from "react"
import type { ContentItem } from "../api/types"

/**
 * Mi Lista — fuente de verdad de la UI (local, persistida en localStorage).
 *
 * Funciona sin backend: guardar/quitar es inmediato y Mi Lista lee de aquí.
 * El contrato real ya existe (`lib/api/saved.ts` → /api/saved); cuando haya backend,
 * sincronizar este store con la API será un cambio localizado (toggle → POST /api/saved/toggle,
 * carga inicial → GET /api/saved). Guardamos el ContentItem completo para poder pintar
 * Mi Lista sin tener que volver a pedir el contenido al servidor.
 */

const KEY = "savedItems"

function read(): ContentItem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ContentItem[]) : []
  } catch {
    return []
  }
}

let items = read()
const listeners = new Set<() => void>()

function commit(next: ContentItem[]) {
  items = next
  localStorage.setItem(KEY, JSON.stringify(items))
  listeners.forEach((l) => l())
}

export function isSaved(id: string) {
  return items.some((i) => i.id === id)
}

/** Añade o quita el contenido de Mi Lista (selector de estado, §9.4). */
export function toggleSavedItem(item: ContentItem) {
  commit(isSaved(item.id) ? items.filter((i) => i.id !== item.id) : [item, ...items])
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function snapshot() {
  return items
}

/** Lista reactiva de guardados (recientes primero). */
export function useSavedItems() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
