import { useSyncExternalStore } from "react"
import { invalidateApiCache, useApi } from "./hooks/useApi"
import { getStarterTestStatus } from "./api/starterTest"

const CACHE_KEY = "starter-test"

// Al hacer el test o quitar un concepto, todas las pantallas abiertas que miran el estado del
// test (el punto rojo del avatar, el banner, Mi Lista…) lo vuelven a pedir al momento.
let version = 0
const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Estado del test inicial (hecho o no y conceptos para trabajar). */
export function useStarterTest() {
  const v = useSyncExternalStore(subscribe, () => version, () => version)
  return useApi(getStarterTestStatus, [v], CACHE_KEY)
}

/** Tras hacer el test o quitar un concepto: lo vuelven a pedir todas las pantallas abiertas. */
export const invalidateStarterTest = () => {
  invalidateApiCache(CACHE_KEY)
  version++
  listeners.forEach((l) => l())
}

/** Enlace al test con su origen (para las métricas). */
export const testHref = (from: "how_it_works" | "home_banner" | "my_list" | "account") => `/app/encuesta/test?from=${from}`
