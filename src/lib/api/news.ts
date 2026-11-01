import { apiGet, apiPost, apiDelete } from "./client"

/** Rol mínimo al que va dirigida una noticia — null/undefined = todos. Mismo valor que UserRole del backend. */
export type NewsTargetRole = "User" | "ContentCreator" | "Admin"

/** Noticia tal como la ve un usuario: incluye si ya la ha leído. */
export type NewsItem = {
  id: number
  title: string
  body: string
  /** Versión en inglés (si la tiene): la campana la enseña con la app en inglés. */
  titleEn?: string | null
  bodyEn?: string | null
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
/** emailsSent: a cuántos se mandó el email (null en las anteriores al 01/11/2026, no se apuntaba).
 * emailClicks: personas distintas que han entrado desde el enlace del email. */
export type AdminNewsItem = {
  id: number
  title: string
  body: string
  titleEn?: string | null
  bodyEn?: string | null
  createdAtUtc: string
  targetRole: NewsTargetRole | null
  emailsSent?: number | null
  emailClicks?: number
}

/** GET /api/admin/news (Admin) → todas las noticias, para gestionarlas. */
export const listAllNews = () => apiGet<AdminNewsItem[]>("/api/admin/news")

/** POST /api/admin/news (Admin) → publica una noticia nueva. targetRole vacío/omitido = todos. */
/** Texto de una noticia en los dos idiomas (el inglés es opcional: sin él, todos ven el español). */
export type NewsDraft = { title: string; body: string; titleEn?: string; bodyEn?: string }

export const createNews = (draft: NewsDraft, targetRole?: NewsTargetRole) =>
  apiPost<AdminNewsItem>("/api/admin/news", { ...draft, targetRole: targetRole || undefined })

/** La versión del idioma pedido: la inglesa si se pide y está completa; si no, la española. */
export const localizedNews = (n: { title: string; body: string; titleEn?: string | null; bodyEn?: string | null }, lang: string) =>
  lang === "en" && n.titleEn && n.bodyEn ? { title: n.titleEn, body: n.bodyEn } : { title: n.title, body: n.body }

/** POST /api/admin/news/test-email (Admin) → manda el email de la noticia solo a `to`, sin publicarla. */
export const sendNewsTestEmail = (draft: NewsDraft, to: string, language: string) =>
  apiPost<{ ok: boolean }>("/api/admin/news/test-email", { ...draft, to, language })

/** DELETE /api/admin/news/{id} (Admin) → borra una noticia. */
export const deleteNews = (id: number) => apiDelete<{ ok: boolean }>(`/api/admin/news/${id}`)
