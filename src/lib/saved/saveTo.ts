import type { ContentItem } from "../api/types"

/** Qué contenido tiene abierta la ventana «Guardar en…» (SaveToSheet). */
let target: ContentItem | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Abre «Guardar en…» para este contenido. */
export function openSaveTo(item: ContentItem) {
  target = item
  emit()
}

export function closeSaveTo() {
  target = null
  emit()
}

export const getSaveTarget = () => target

export const subscribeSaveTo = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
