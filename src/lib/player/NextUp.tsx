import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Play, X } from "lucide-react"
import type { ContentItem } from "../api/types"
import { hueFor, thumbStyle, watchHref } from "../format"

/**
 * Autoplay / "Siguiente" (§9.7 y §10.7). Al terminar un vídeo se ofrece el siguiente
 * contenido relacionado, priorizando el mismo concepto. Se usa como `endSlot` del
 * reproductor, por lo que aparece encima del vídeo (también en pantalla completa).
 */

const AUTOPLAY_KEY = "autoplayNext"

/** Preferencia de reproducción automática, persistida en localStorage (por defecto activada). */
export function useAutoplay(): [boolean, (value: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(AUTOPLAY_KEY) !== "off"
    } catch {
      return true
    }
  })
  const set = (value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(AUTOPLAY_KEY, value ? "on" : "off")
    } catch {
      /* modo privado: se mantiene en memoria */
    }
  }
  return [on, set]
}

/**
 * Elige el siguiente contenido relacionado: primero uno que comparta concepto (§9.6),
 * y si no hay, el primero de la lista (que ya prioriza mismo bloque desde el backend).
 */
export function pickNextRelated(related: ContentItem[] | undefined, concepts: string[]): ContentItem | null {
  if (!related || related.length === 0) return null
  const set = new Set(concepts)
  const sameConcept = related.find((r) => (r.concepts ?? []).some((c) => set.has(c)))
  return sameConcept ?? related[0]
}

export const NextUpCard = ({
  item,
  label,
  autoplay,
  onToggleAutoplay,
}: {
  item: ContentItem
  label: string
  autoplay: boolean
  onToggleAutoplay: (value: boolean) => void
}) => {
  const navigate = useNavigate()
  const [seconds, setSeconds] = useState(autoplay ? 3 : -1) // -1 = sin cuenta atrás
  const go = () => navigate(watchHref(item))

  // Cuenta atrás → navegar. Cancelable (poniendo seconds a -1).
  useEffect(() => {
    if (seconds < 0) return
    if (seconds === 0) {
      go()
      return
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  const counting = seconds > 0

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-midnight/95 p-5 text-center shadow-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neon-cyan">
        {counting ? `${label} en ${seconds}…` : label}
      </p>

      <button onClick={go} className="group mt-4 block w-full overflow-hidden rounded-xl border border-white/10 text-left">
        <div className="relative aspect-video w-full" style={thumbStyle(hueFor(item.id))}>
          {item.thumbnailUrl && (
            <img src={item.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-cyan text-midnight transition group-hover:scale-105">
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        </div>
      </button>
      <p className="mt-3 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={go}
          className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-semibold text-midnight transition hover:brightness-110"
        >
          <Play className="h-4 w-4" fill="currentColor" /> Reproducir ahora
        </button>
        {counting && (
          <button
            onClick={() => setSeconds(-1)}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-xs text-white/50">
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(e) => onToggleAutoplay(e.target.checked)}
          className="h-3.5 w-3.5 accent-neon-cyan"
        />
        Reproducción automática
      </label>
    </div>
  )
}
