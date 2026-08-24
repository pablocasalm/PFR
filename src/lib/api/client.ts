import { API_BASE } from "../config"

/**
 * Cliente fetch tipado contra el backend PFR_API.
 * Adjunta el token JWT (si existe en localStorage) automáticamente.
 */

/**
 * Si tras intentar refrescar la sesión (ver refreshAccessToken) seguimos con un 401, el
 * refresh token también ha muerto de verdad — sin esto, `RequireAuth` solo comprueba que
 * exista un token, no que siga siendo válido, así que la sesión se quedaría "viva" para
 * siempre mientras cada llamada a la API falla y la app se ve rota (§reporte de beta).
 * Se borra la sesión y se manda a login directamente (evita el ciclo de import con
 * auth/store.ts).
 */
function handleUnauthorized(hadToken: boolean) {
  if (!hadToken) return
  try {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
  } catch {
    /* modo privado: no crítico, la recarga a /login igual corta la sesión visualmente */
  }
  if (!window.location.pathname.startsWith("/login")) window.location.href = "/login"
}

// Solo estas tres no deben disparar un intento de refresh en su propio 401: login/register
// fallan por credenciales (no por sesión caducada), y refresh no puede reintentarse a sí
// mismo. El resto de /api/auth/* (onboarding-seen, logout...) sí puede beneficiarse del
// reintento normal si el access token había caducado.
const NO_REFRESH_ENDPOINTS = ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"]
const isAuthEndpoint = (endpoint: string) => NO_REFRESH_ENDPOINTS.some((e) => endpoint.startsWith(e))

/**
 * Canjea el refresh token (cookie httpOnly, invisible aquí — el navegador la manda solo)
 * por un access token nuevo, sin pedir credenciales otra vez. Con varias peticiones fallando
 * en paralelo, comparten esta misma promesa: solo se dispara UNA llamada de refresh, no una
 * por cada 401 simultáneo.
 */
let refreshPromise: Promise<boolean> | null = null

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: "POST", credentials: "include" })
        if (!res.ok) return false
        const data = await res.json()
        if (!data?.token) return false
        localStorage.setItem("token", data.token)
        localStorage.setItem(
          "user",
          JSON.stringify({
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            hasSeenOnboarding: data.hasSeenOnboarding,
          }),
        )
        return true
      } catch {
        return false
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401 && !isRetry && !isAuthEndpoint(endpoint)) {
    if (await refreshAccessToken()) return apiFetch<T>(endpoint, options, true)
  }

  const text = await res.text()
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(!!token)
    let message = `Error ${res.status}`
    try {
      message = text ? (JSON.parse(text).message ?? text) : message
    } catch {
      message = text || message
    }
    throw new Error(message)
  }

  return text ? (JSON.parse(text) as T) : ({} as T)
}

export const apiGet = <T>(endpoint: string) => apiFetch<T>(endpoint)

export const apiPost = <T>(endpoint: string, body?: unknown) =>
  apiFetch<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined })

export const apiPatch = <T>(endpoint: string, body?: unknown) =>
  apiFetch<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined })

export const apiDelete = <T>(endpoint: string) => apiFetch<T>(endpoint, { method: "DELETE" })

/**
 * POST para login/register/refresh/logout: con `credentials: "include"` para que el
 * navegador mande y reciba la cookie httpOnly del refresh token. El resto de peticiones no
 * la necesitan (van con el access token normal por Authorization), así que no la piden.
 */
export const apiPostAuth = <T>(endpoint: string, body?: unknown) =>
  apiFetch<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined, credentials: "include" })

/**
 * Fetch "en crudo" con el token adjunto, sin forzar Content-Type (lo necesitan FormData y
 * blobs, donde forzar application/json rompería la petición o la respuesta).
 */
async function apiFetchRaw(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  if (res.status === 401 && !isRetry && !isAuthEndpoint(endpoint)) {
    if (await refreshAccessToken()) return apiFetchRaw(endpoint, options, true)
  }

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized(!!token)
    const text = await res.text()
    let message = `Error ${res.status}`
    try {
      message = text ? (JSON.parse(text).message ?? text) : message
    } catch {
      message = text || message
    }
    throw new Error(message)
  }
  return res
}

/** POST multipart/form-data (subida de ficheros) — el navegador pone el Content-Type/boundary. */
export const apiPostForm = async <T>(endpoint: string, formData: FormData): Promise<T> => {
  const res = await apiFetchRaw(endpoint, { method: "POST", body: formData })
  const text = await res.text()
  return text ? (JSON.parse(text) as T) : ({} as T)
}

/** GET que devuelve un blob (imágenes protegidas por sesión, no servibles con un <img src> normal). */
export const apiGetBlob = (endpoint: string): Promise<Blob> => apiFetchRaw(endpoint).then((res) => res.blob())
