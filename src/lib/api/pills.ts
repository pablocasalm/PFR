import { apiGet } from "./client"
import type { Comment, ContentItem } from "./types"

/**
 * Píldoras (tarjetas #134/#136): vídeos cortos y verticales con un consejo concreto, con su
 * propio reproductor (/app/pildoras). Me gusta y comentarios van por social.ts con el tipo "pill".
 */

/** GET /api/pills/{id} → lo que necesita el reproductor de una píldora. */
export type PillDetail = {
  id: string
  type: "pill"
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  durationSeconds: number
  thumbnailUrl: string
  videoUrl: string
  videoUrlEn?: string | null
  blockId: number
  block: string
  blockEn: string
  concepts: string[]
  conceptsEn: string[]
  conceptIds: number[]
  resumeSeconds: number
  comments: Comment[]
  likes: number
  likedByMe: boolean
}

/** GET /api/pills?blockId= → píldoras en orden de recorrido (por bloque y, dentro, por fecha). */
export const getPills = (blockId?: number) => apiGet<ContentItem[]>(`/api/pills${blockId ? `?blockId=${blockId}` : ""}`)

export const getPillDetail = (id: string) => apiGet<PillDetail>(`/api/pills/${id}`)
