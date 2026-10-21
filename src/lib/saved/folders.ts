import { useSyncExternalStore } from "react"
import type { ContentItem } from "../api/types"
import {
  addToSavedFolder,
  createSavedFolder,
  deleteSavedFolder,
  getSavedFolders,
  removeFromSavedFolder,
  renameSavedFolder,
  reorderSavedFolders,
  setItemFolders,
  type SavedFolder,
} from "../api/saved"

/**
 * Carpetas de Mi Lista que crea el usuario (privadas), sincronizadas con /api/saved/folders.
 * Mismo patrón que el store de guardados: cambio optimista en la UI y, si el servidor falla, se
 * vuelve atrás. Un contenido puede estar en varias carpetas; su clave es "clip:c1" / "analysis:a1".
 * Las carpetas del sistema (p. ej. «Análisis de Coach») no están aquí: las calcula Mi Lista.
 */

export const itemKey = (item: Pick<ContentItem, "type" | "id">) => `${item.type}:${item.id}`

let folders: SavedFolder[] = []
const listeners = new Set<() => void>()

function commit(next: SavedFolder[]) {
  folders = next
  listeners.forEach((l) => l())
}

/** Optimista: aplica `next` ya y, si `request` falla, vuelve al estado anterior. */
function optimistic(next: SavedFolder[], request: () => Promise<unknown>) {
  const previous = folders
  commit(next)
  return request().catch((err) => {
    commit(previous)
    throw err
  })
}

export async function hydrateFolders() {
  try {
    commit(await getSavedFolders())
  } catch {
    // Sin sesión / sin suscripción: sin carpetas.
  }
}

export function clearFolders() {
  commit([])
}

export async function createFolder(name: string) {
  const created = await createSavedFolder(name)
  commit([...folders, created])
  return created
}

export const renameFolder = (id: number, name: string) =>
  optimistic(
    folders.map((f) => (f.id === id ? { ...f, name } : f)),
    () => renameSavedFolder(id, name),
  )

export const deleteFolder = (id: number) =>
  optimistic(
    folders.filter((f) => f.id !== id),
    () => deleteSavedFolder(id),
  )

/** Mueve una carpeta una posición a la izquierda (-1) o a la derecha (+1). */
export function moveFolder(id: number, direction: -1 | 1) {
  const i = folders.findIndex((f) => f.id === id)
  const j = i + direction
  if (i < 0 || j < 0 || j >= folders.length) return Promise.resolve()
  const next = [...folders]
  ;[next[i], next[j]] = [next[j], next[i]]
  return optimistic(
    next.map((f, k) => ({ ...f, sortOrder: k })),
    () => reorderSavedFolders(next.map((f) => f.id)),
  )
}

export const addToFolder = (id: number, keys: string[]) =>
  optimistic(
    folders.map((f) => (f.id === id ? { ...f, items: [...keys.filter((k) => !f.items.includes(k)), ...f.items] } : f)),
    () => addToSavedFolder(id, keys),
  )

export const removeFromFolder = (id: number, keys: string[]) =>
  optimistic(
    folders.map((f) => (f.id === id ? { ...f, items: f.items.filter((k) => !keys.includes(k)) } : f)),
    () => removeFromSavedFolder(id, keys),
  )

/** «Guardar en…»: deja el contenido exactamente en `folderIds`. */
export const setFoldersFor = (key: string, folderIds: number[]) =>
  optimistic(
    folders.map((f) => {
      const inIt = f.items.includes(key)
      const wanted = folderIds.includes(f.id)
      if (wanted && !inIt) return { ...f, items: [key, ...f.items] }
      if (!wanted && inIt) return { ...f, items: f.items.filter((k) => k !== key) }
      return f
    }),
    () => setItemFolders(key, folderIds),
  )

/** Al quitar algo de Mi Lista, el servidor lo saca de todas las carpetas: lo reflejamos aquí. */
export function forgetItemInFolders(key: string) {
  if (folders.some((f) => f.items.includes(key))) commit(folders.map((f) => ({ ...f, items: f.items.filter((k) => k !== key) })))
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => folders

/** Mis carpetas, en mi orden. */
export function useFolders() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
