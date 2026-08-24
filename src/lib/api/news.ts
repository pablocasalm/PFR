import { apiGet, apiPost, apiDelete } from "./client"

/** Noticia tal como la ve un usuario: incluye si ya la ha leído. */
export type NewsItem = { id: number; title: string; body: string; createdAtUtc: string; isRead: boolean }
export type NewsResponse = { items: NewsItem[]; unreadCount: number }

/** GET /api/news → últimas noticias + cuáles ha leído ya el usuario actual. */
export const getNews = () => apiGet<NewsResponse>("/api/news")

/** POST /api/news/mark-all-read → marca como leídas todas las noticias pendientes (al abrir la campana). */
export const markAllNewsRead = () => apiPost<{ ok: boolean }>("/api/news/mark-all-read")

/** Noticia tal como la gestiona el admin (igual para todos, sin isRead). */
export type AdminNewsItem = { id: number; title: string; body: string; createdAtUtc: string }

/** GET /api/admin/news (Admin) → todas las noticias, para gestionarlas. */
export const listAllNews = () => apiGet<AdminNewsItem[]>("/api/admin/news")

/** POST /api/admin/news (Admin) → publica una noticia nueva. */
export const createNews = (title: string, body: string) => apiPost<AdminNewsItem>("/api/admin/news", { title, body })

/** DELETE /api/admin/news/{id} (Admin) → borra una noticia. */
export const deleteNews = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/news/${id}`)
