import { apiGet, apiPost, apiDelete } from "./client"

/** Rol mínimo al que va dirigida una noticia — null/undefined = todos. Mismo valor que UserRole del backend. */
export type NewsTargetRole = "User" | "ContentCreator" | "Admin"

/** Noticia tal como la ve un usuario: incluye si ya la ha leído. */
export type NewsItem = {
  id: number
  title: string
  body: string
  createdAtUtc: string
  isRead: boolean
  targetRole: NewsTargetRole | null
}
export type NewsResponse = { items: NewsItem[]; unreadCount: number }

/** GET /api/news → últimas noticias + cuáles ha leído ya el usuario actual. */
export const getNews = () => apiGet<NewsResponse>("/api/news")

/** POST /api/news/mark-all-read → marca como leídas todas las noticias pendientes (al abrir la campana). */
export const markAllNewsRead = () => apiPost<{ ok: boolean }>("/api/news/mark-all-read")

/** Noticia tal como la gestiona el admin (igual para todos, sin isRead). */
export type AdminNewsItem = { id: number; title: string; body: string; createdAtUtc: string; targetRole: NewsTargetRole | null }

/** GET /api/admin/news (Admin) → todas las noticias, para gestionarlas. */
export const listAllNews = () => apiGet<AdminNewsItem[]>("/api/admin/news")

/** POST /api/admin/news (Admin) → publica una noticia nueva. targetRole vacío/omitido = todos. */
export const createNews = (title: string, body: string, targetRole?: NewsTargetRole) =>
  apiPost<AdminNewsItem>("/api/admin/news", { title, body, targetRole: targetRole || undefined })

/** DELETE /api/admin/news/{id} (Admin) → borra una noticia. */
export const deleteNews = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/news/${id}`)
