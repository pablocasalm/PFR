import { apiDelete, apiGet, apiPatch, apiPost } from "./client"
import type { SavedListResponse } from "./types"

/**
 * Mi Lista (§12): contenido guardado por el usuario. Todos los endpoints requieren auth.
 * Sustituye al antiguo "bookmarks" (que solo cubría clips); ahora guarda clips y análisis.
 */

/** GET /api/saved → pantalla Mi Lista (clips y análisis guardados, recientes primero). */
export const getSavedList = () => apiGet<SavedListResponse>("/api/saved")

/** GET /api/saved/ids → claves guardadas ("clip:c1", "analysis:a1") para marcar el estado en tarjetas. */
export const getSavedIds = () => apiGet<string[]>("/api/saved/ids")

/** POST /api/saved/toggle → añade o quita contenido de Mi Lista. Devuelve `{ ok, saved }`. */
export const toggleSaved = (contentType: "clip" | "analysis", contentId: string) =>
  apiPost<{ ok: boolean; saved: boolean }>("/api/saved/toggle", { contentType, contentId })

/** Carpeta de Mi Lista creada por el usuario (privada). `items` son claves "clip:c1" / "analysis:a1",
 * las más recientes primero. Un contenido puede estar en varias carpetas. */
export type SavedFolder = { id: number; name: string; sortOrder: number; items: string[] }

/** GET /api/saved/folders → mis carpetas, en mi orden. */
export const getSavedFolders = () => apiGet<SavedFolder[]>("/api/saved/folders")
/** POST /api/saved/folders → nueva carpeta (al final). */
export const createSavedFolder = (name: string) => apiPost<SavedFolder>("/api/saved/folders", { name })
/** PATCH /api/saved/folders/{id} → renombrar. */
export const renameSavedFolder = (id: number, name: string) => apiPatch<{ ok: boolean }>(`/api/saved/folders/${id}`, { name })
/** DELETE /api/saved/folders/{id} → borrar (lo guardado sigue en Mi Lista). */
export const deleteSavedFolder = (id: number) => apiDelete<{ ok: boolean }>(`/api/saved/folders/${id}`)
/** POST /api/saved/folders/order → nuevo orden de mis carpetas. */
export const reorderSavedFolders = (ids: number[]) => apiPost<{ ok: boolean }>("/api/saved/folders/order", { ids })
/** POST /api/saved/folders/{id}/items → añadir contenido a una carpeta (y a Mi Lista si no estaba). */
export const addToSavedFolder = (id: number, keys: string[]) => apiPost<{ ok: boolean }>(`/api/saved/folders/${id}/items`, { keys })
/** POST /api/saved/folders/{id}/items/remove → quitarlo de esa carpeta (sigue en Mi Lista). */
export const removeFromSavedFolder = (id: number, keys: string[]) => apiPost<{ ok: boolean }>(`/api/saved/folders/${id}/items/remove`, { keys })
/** POST /api/saved/folders/item → «Guardar en…»: deja el contenido exactamente en esas carpetas. */
export const setItemFolders = (key: string, folderIds: number[]) => apiPost<{ ok: boolean }>("/api/saved/folders/item", { key, folderIds })
