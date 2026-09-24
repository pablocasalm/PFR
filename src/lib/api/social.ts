import { apiPost } from "./client"
import type { Comment } from "./types"

/**
 * Acciones sociales (§ me gusta + comentarios). El frontend define el contrato;
 * el backend se adapta. Rutas por tipo, coherentes con clips.ts / analyses.ts.
 */

type SocialType = "clip" | "analysis" | "session"

const base = (type: SocialType) => (type === "analysis" ? "/api/analyses" : type === "session" ? "/api/sessions" : "/api/clips")

/** POST .../{id}/like → alterna me gusta. Devuelve el estado resultante. */
export const toggleLike = (type: SocialType, id: string) =>
  apiPost<{ liked: boolean; likes: number }>(`${base(type)}/${id}/like`)

/** POST .../{id}/comments → publica un comentario y devuelve el creado. */
export const addComment = (type: SocialType, id: string, text: string) =>
  apiPost<Comment>(`${base(type)}/${id}/comments`, { text })
