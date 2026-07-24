import type { ContentItem } from "./api/types"

/** Segundos → "mm:ss" (o "h:mm:ss" si supera la hora). */
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Hash estable id → tono, para el degradado de fondo cuando no hay miniatura. */
export const hueFor = (seed: string) => {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return 200 + (h % 60)
}

export const thumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 42%, 24%), hsl(${hue + 20}, 45%, 9%))`,
})

/** Ruta del visor según el tipo de contenido. */
export const watchHref = (item: Pick<ContentItem, "id" | "type">) =>
  item.type === "analysis" ? `/app/watch?v=${item.id}` : `/app/watch?c=${item.id}`
