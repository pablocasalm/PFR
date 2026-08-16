import { API_BASE } from "../config"

/**
 * Cliente fetch tipado contra el backend PFR_API.
 * Adjunta el token JWT (si existe en localStorage) automáticamente.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const text = await res.text()
  if (!res.ok) {
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
 * Fetch "en crudo" con el token adjunto, sin forzar Content-Type (lo necesitan FormData y
 * blobs, donde forzar application/json rompería la petición o la respuesta).
 */
async function apiFetchRaw(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token")
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
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
