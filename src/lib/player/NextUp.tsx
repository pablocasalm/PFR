import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Play, RotateCcw } from "lucide-react"
import type { ContentItem } from "../api/types"
import { hueFor, thumbStyle, watchHref } from "../format"
import { useI18n } from "../i18n/store"
import { pickText } from "../i18n/content"

/**
 * "Siguiente" (§9.7 y §10.7). Al terminar un vídeo se ofrece volver a verlo o pasar al
 * siguiente contenido relacionado, priorizando el mismo concepto. Si no se hace nada, salta solo
 * tras una cuenta atrás de COUNTDOWN_SECONDS; cualquier toque, clic o tecla en cualquier punto
 * de la pantalla la cancela (como en YouTube/Netflix) y la tarjeta se queda esperando — así
 * quien quiere quedarse leyendo la descripción solo tiene que tocar o hacer scroll. No hay
 * casilla de preferencia: la reproducción automática está siempre activa. Se usa como `endSlot` del
 * reproductor, por lo que aparece encima del vídeo (también en pantalla completa).
 */

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

/** Segundos de cuenta atrás antes de pasar solo al siguiente. */
const COUNTDOWN_SECONDS = 10

export const NextUpCard = ({
  item,
  label,
  onReplay,
}: {
  item: ContentItem
  label: string
  /** Vuelve a reproducir el vídeo actual desde el principio (y cierra la tarjeta). */
  onReplay: () => void
}) => {
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS) // -1 = cuenta atrás cancelada
  const go = () => navigate(watchHref(item))

  // Cuenta atrás → navegar.
  useEffect(() => {
    if (seconds < 0) return
    if (seconds === 0) {
      go()
      return
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  const counting = seconds > 0

  // Cualquier interacción en la página cancela la cuenta atrás. En fase de captura, para
  // enterarse antes que nadie; no se frena el evento, así que el toque hace además lo suyo
  // (p. ej. pulsar "Ver el siguiente" cancela y navega igualmente).
  useEffect(() => {
    if (!counting) return
    const cancel = () => setSeconds(-1)
    document.addEventListener("pointerdown", cancel, true)
    document.addEventListener("keydown", cancel, true)
    document.addEventListener("wheel", cancel, { capture: true, passive: true })
    return () => {
      document.removeEventListener("pointerdown", cancel, true)
      document.removeEventListener("keydown", cancel, true)
      document.removeEventListener("wheel", cancel, true)
    }
  }, [counting])

  // Compacta y en horizontal (miniatura a la izquierda): tiene que caber entera dentro de un
  // reproductor 16:9 a ancho de móvil (~200px de alto) — con la miniatura a todo el ancho y
  // todo apilado, los botones quedaban cortados por abajo (§reporte de beta). Si aun así no
  // cupiera, hace scroll dentro de la propia tarjeta en vez de recortarse.
  return (
    <div className="flex max-h-full w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-white/15 bg-midnight/95 p-3 shadow-2xl sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neon-cyan">
        {counting ? t("next-up.countdown", "{label} en {seconds}…", { label, seconds }) : label}
      </p>

      <button onClick={go} className="group mt-2.5 flex items-center gap-3 text-left sm:mt-4">
        <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border border-white/10 sm:w-40" style={thumbStyle(hueFor(item.id))}>
          {item.thumbnailUrl && <img src={item.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-neon-cyan">{pickText(item.title, item.titleEn, lang)}</p>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
        <button
          onClick={() => {
            setSeconds(-1)
            onReplay()
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5"
        >
          <RotateCcw className="h-4 w-4" /> {t("next-up.replay", "Volver a ver")}
        </button>
        <button onClick={go} className="flex items-center justify-center gap-1.5 rounded-lg bg-neon-cyan px-3 py-2 text-sm font-semibold text-midnight transition hover:brightness-110">
          <Play className="h-4 w-4" fill="currentColor" /> {t("next-up.play-next", "Ver el siguiente")}
        </button>
      </div>
    </div>
  )
}
