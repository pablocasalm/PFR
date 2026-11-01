import { trackActivity } from "./api/activity"

/**
 * Entradas desde el email de una noticia (enlace con `from=email&n={id}`, ver NewsController).
 * Se apunta al arrancar la app, antes del login: si la persona no tenía la sesión abierta, el
 * login se come los parámetros de la URL. Se envía en cuanto hay sesión (NewsBell) y se borra.
 * n=0 es el email de prueba: no cuenta.
 */
const KEY = "pfr.newsEmailClick"

export function captureNewsEmailClick() {
  try {
    const params = new URLSearchParams(window.location.search)
    const id = Number(params.get("n"))
    if (params.get("from") === "email" && id > 0) localStorage.setItem(KEY, String(id))
  } catch {
    // Sin localStorage (modo privado estricto): no se apunta, no pasa nada.
  }
}

export function flushNewsEmailClick() {
  try {
    const id = localStorage.getItem(KEY)
    if (!id) return
    localStorage.removeItem(KEY)
    trackActivity("news_email_click", id)
  } catch {
    // Igual que arriba.
  }
}
