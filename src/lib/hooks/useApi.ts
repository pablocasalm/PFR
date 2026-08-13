import { useEffect, useState } from "react"

type ApiState<T> = { data: T | null; loading: boolean; error: string | null; validating: boolean }

/**
 * Caché en memoria (módulo) para las respuestas de la API. Sobrevive a los cambios de página
 * (los componentes se desmontan, pero el módulo no), así que al volver a una pantalla ya
 * visitada mostramos los datos al instante en vez de "Cargando".
 */
type CacheEntry = { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>()

/** Cuánto tiempo consideramos "fresca" una respuesta antes de revalidar en 2.º plano. */
const STALE_MS = 30_000

/** Invalida la caché (una clave o toda). Útil tras una mutación o al cerrar sesión. */
export function invalidateApiCache(key?: string) {
  if (key) cache.delete(key)
  else cache.clear()
}

/**
 * Hook genérico de carga de datos. Ejecuta `fn` al montar (y cuando cambian `deps`).
 *
 * Si se pasa `cacheKey`, aplica *stale-while-revalidate*:
 *  - si hay datos cacheados, los devuelve al instante (loading = false) y revalida en 2.º plano;
 *  - si la caché es reciente (< STALE_MS), ni siquiera revalida;
 *  - si un refetch falla pero teníamos datos, conservamos los datos (no rompemos la pantalla).
 *
 * Sin `cacheKey` se comporta como siempre (fetch en cada montaje).
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = [], cacheKey?: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>(() => {
    const cached = cacheKey ? cache.get(cacheKey) : undefined
    return cached
      ? { data: cached.data as T, loading: false, error: null, validating: false }
      : { data: null, loading: true, error: null, validating: false }
  })

  useEffect(() => {
    let active = true
    const entry = cacheKey ? cache.get(cacheKey) : undefined

    if (entry) {
      const fresh = Date.now() - entry.ts < STALE_MS
      // Mostramos lo cacheado ya; revalidamos solo si está "viejo".
      setState({ data: entry.data as T, loading: false, error: null, validating: !fresh })
      if (fresh) return
    } else {
      setState({ data: null, loading: true, error: null, validating: false })
    }

    fn()
      .then((data) => {
        if (cacheKey) cache.set(cacheKey, { data, ts: Date.now() })
        if (active) setState({ data, loading: false, error: null, validating: false })
      })
      .catch((e: unknown) => {
        if (!active) return
        const message = e instanceof Error ? e.message : "Error"
        setState((prev) =>
          // Si ya teníamos datos (revalidación fallida), los mantenemos en pantalla.
          prev.data
            ? { ...prev, validating: false }
            : { data: null, loading: false, error: message, validating: false },
        )
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, cacheKey])

  return state
}
