import * as tus from "tus-js-client"
import { apiGet, apiPost } from "./client"

/**
 * Publicación de contenido (solo Admin/ContentCreator). Flujo Direct Creator Upload:
 * 1) pedir uploadURL al backend, 2) subir el fichero directo a Cloudflare, 3) crear el
 * clip/análisis con el uid + metadatos.
 */

export type DirectUpload = { uploadURL: string; uid: string }

export const createDirectUpload = (name: string, size: number) =>
  apiPost<DirectUpload>("/api/admin/videos/direct-upload", { name, size })

// --- Publicación combinada: un análisis + sus clips (§ proceso de publicación) ---

export type BlockConceptsInput = { block: string; concepts: string[] }

export type PublishClipInput = {
  uid: string
  title: string
  description?: string
  durationSeconds?: number
  blocks: BlockConceptsInput[]
}

export type PublishChapterInput = { startSeconds: number; title: string; concept?: string }

export type PublishInput = {
  analysis: {
    uid: string
    title: string
    description?: string
    durationSeconds?: number
    players: string[]
    venue?: string
    category?: string
    round?: string
    year?: number
    chapters: PublishChapterInput[]
  }
  clips: PublishClipInput[]
}

export const publish = (input: PublishInput) =>
  apiPost<{ ok: boolean; analysisId: string; clipIds: string[] }>("/api/admin/publish", input)

// --- Catálogo reutilizable (autocompletado): un solo endpoint, el front manda el `type` ---

export type CatalogType = "player" | "venue" | "category" | "concept"

// Para conceptos, `block` filtra las sugerencias por bloque (§8.3).
export const lookup = (type: CatalogType, q: string, block?: string) =>
  apiGet<string[]>(
    `/api/admin/lookup?type=${type}&q=${encodeURIComponent(q)}${block ? `&block=${encodeURIComponent(block)}` : ""}`,
  )

/** Estado de procesado del vídeo en Cloudflare. ready = listo para reproducir. */
export type VideoStatus = { state: string; ready: boolean }

export const getVideoStatus = (uid: string) =>
  apiGet<VideoStatus>(`/api/admin/videos/${uid}/status`)

/**
 * Sube el fichero directo a Cloudflare con el protocolo tus (subida resumible), que admite
 * archivos grandes (>200 MB, límite de la subida básica que daba error 413) y reintentos.
 * La subida ya está creada en el backend, así que aquí solo se envían los datos (uploadUrl).
 * `onProgress` recibe un porcentaje 0-100.
 */
export function uploadToCloudflare(uploadURL: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      uploadUrl: uploadURL,
      chunkSize: 50 * 1024 * 1024, // 50 MiB (múltiplo de 256 KiB, requerido por Cloudflare)
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (uploaded, total) => {
        if (onProgress && total) onProgress(Math.round((uploaded / total) * 100))
      },
      onSuccess: () => resolve(),
    })
    upload.start()
  })
}

/** Lee la duración del vídeo en el navegador antes de subirlo (para guardarla en el contenido). */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}
