import { useEffect, useState } from "react"

/**
 * Lo ya visto (`completed`, el mismo criterio que la insignia de las tarjetas): se manda al final
 * de las filas para que lo primero sea contenido nuevo (reporte #104), y se puede ocultar con el
 * interruptor «Ocultar vistos» de Explorar y Resultados (reporte #106).
 */

/** Misma lista con lo visto al final, sin cambiar el orden dentro de cada grupo. */
export const watchedLast = <T extends { completed?: boolean }>(items: T[]): T[] => [
  ...items.filter((i) => !i.completed),
  ...items.filter((i) => i.completed),
]

// Preferencia por dispositivo, compartida entre Explorar y Resultados: si la activas en una,
// sigue activa en la otra y la próxima vez que abras la app.
const KEY = "pfr.hideWatched"
const EVENT = "pfr:hide-watched"

const read = () => {
  try {
    return localStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

export const useHideWatched = (): [boolean, (value: boolean) => void] => {
  const [hide, setHide] = useState(read)
  useEffect(() => {
    const sync = () => setHide(read())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  const set = (value: boolean) => {
    setHide(value)
    try {
      localStorage.setItem(KEY, value ? "1" : "0")
    } catch {
      // Sin almacenamiento (modo privado): vale para esta visita.
    }
    window.dispatchEvent(new Event(EVENT))
  }
  return [hide, set]
}
