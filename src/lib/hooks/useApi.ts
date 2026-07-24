import { useEffect, useState } from "react"

type ApiState<T> = { data: T | null; loading: boolean; error: string | null }

/**
 * Hook genérico de carga de datos. Ejecuta `fn` al montar (y cuando cambian `deps`)
 * y expone { data, loading, error }. Sin dependencias externas.
 */
export function useApi<T>(fn: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    let active = true
    setState({ data: null, loading: true, error: null })
    fn()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((e: unknown) =>
        active &&
        setState({ data: null, loading: false, error: e instanceof Error ? e.message : "Error" })
      )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
