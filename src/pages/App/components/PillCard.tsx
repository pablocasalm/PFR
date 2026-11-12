import { Link } from "react-router-dom"
import type { ContentItem } from "../../../lib/api/types"
import { hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"
import { Thumb } from "./ContentCard"
import ProgressLine from "./ProgressLine"

/**
 * Tarjeta vertical de una píldora (tarjetas #134/#136): Inicio, Explorar, el final del test
 * inicial y la carpeta «Píldoras» de Mi Lista. Nunca se mezcla con tarjetas horizontales.
 * La portada es el primer fotograma del vídeo vertical, entera (caja 9:16, sin recortes ni
 * reencuadres). Encima solo el título, en 2 líneas como mucho: sin duración (todas son cortas) ni
 * icono de play (en el móvil no hay ratón). Lo visto, con la línea azul de abajo (ya vista, llena
 * y el título más apagado).
 */
const PillCard = ({ item }: { item: ContentItem }) => {
  const { lang } = useI18n()
  return (
    <Link to={`/app/pildoras?p=${item.id}`} className="group block w-full">
      <div className="relative overflow-hidden rounded-xl border border-white/10 transition group-hover:border-white/25">
        <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-[9/16] w-full" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        <p className={`absolute inset-x-2 bottom-2 line-clamp-2 text-xs font-semibold leading-snug ${item.completed ? "text-white/60" : "text-white"}`}>
          {pickText(item.title, item.titleEn, lang)}
        </p>
        <ProgressLine progress={item.progress} completed={item.completed} />
      </div>
    </Link>
  )
}

export default PillCard
