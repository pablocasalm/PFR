import { useSyncExternalStore } from "react"
import type { ContentItem } from "../api/types"
import { getSavedList, toggleSaved } from "../api/saved"

/**
 * Mi Lista — fuente de verdad de la UI, sincronizada con el backend (/api/saved).
 *
 * Estrategia:
 *  - localStorage = caché para pintar al instante (incluso antes de responder el server).
 *  - `hydrateSaved()` (al entrar en /app) reemplaza la caché con la verdad del servidor.
 *  - `toggleSavedItem()` es optimista: cambia local al momento y lanza POST /api/saved/toggle;
 *    si el server falla, revierte y avisa a la UI.
 * Guardamos el ContentItem completo para poder pintar Mi Lista sin volver a pedir el contenido.
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
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    // Sin persistencia (modo privado / cuota): seguimos con el estado en memoria.
  }
  listeners.forEach((l) => l())
}

export function isSaved(id: string) {
  return items.some((i) => i.id === id)
}

/**
 * Añade o quita el contenido de Mi Lista (selector de estado, §9.4).
 * Optimista: la UI cambia al instante; si el backend rechaza, se revierte.
 */
export function toggleSavedItem(item: ContentItem) {
  const previous = items
  commit(isSaved(item.id) ? items.filter((i) => i.id !== item.id) : [item, ...items])
  toggleSaved(item.type, item.id).catch(() => {
    // Revertir al estado anterior si el servidor falla (p. ej. sin sesión / red caída).
    commit(previous)
  })
}

/**
 * Carga inicial desde el backend: reemplaza la caché local con lo guardado en la cuenta.
 * Silenciosa: si no hay sesión o el server no responde, se mantiene la caché local.
 */
export async function hydrateSaved() {
  try {
    const data = await getSavedList()
    commit([...data.clips, ...data.analyses])
  } catch {
    // Sin backend / sin sesión: conservamos lo que haya en localStorage.
  }
}

/** Vacía Mi Lista (al cerrar sesión) para no mezclar cuentas en el mismo navegador. */
export function clearSaved() {
  commit([])
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
