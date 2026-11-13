import { useSyncExternalStore } from "react"

/**
 * Si la valoración de la plataforma (RatingPrompt) está en pantalla. La usa el muñeco para
 * esconderse mientras tanto: los dos viven en la esquina de abajo a la derecha, y un aviso tapado
 * no debe contar como visto.
 */
let open = false
const listeners = new Set<() => void>()

export const setRatingOpen = (value: boolean) => {
  if (open === value) return
  open = value
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useRatingOpen = () => useSyncExternalStore(subscribe, () => open)
