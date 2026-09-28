import { Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Relleno borroso + CTA para una sección que no está en el tier actual (§rediseño Club/Coach).
 * No llama nunca a la API propia de la sección bloqueada — el backend no manda esos datos a
 * quien no puede verlos (RequireTier).
 *
 * Es una fila de miniaturas reales con huecos entre ellas y un título + tag reales debajo de
 * cada una, como ContentCard/CardRow en el resto de la app (de contenido que SÍ es público para
 * el tier actual — p. ej. Inicio ya tiene "Nuevo esta semana" cargado para todos). El título/tag
 * de cada hueco NO tiene por qué ser el de esa miniatura en concreto — quien llama baraja las
 * miniaturas y los textos por separado, así no se puede usar el texto para adivinar qué vídeo
 * es exactamente. Con el mismo aire hasta el borde que una fila normal, para que no dé la
 * sensación de que el título se corta contra el borde de la caja. Las dos filas (miniaturas y
 * texto) usan el mismo ancho real (inset-x-0), no sangrado por los lados — con anchos distintos
 * el reparto por flex-1 salía distinto y la última columna quedaba descuadrada respecto a su
 * miniatura. Solo se sobredimensiona por ARRIBA (eje vertical, no afecta a las columnas) para
 * que el difuminado no corte en seco contra ese borde. Solo 2 columnas en móvil (`hidden
 * sm:block` en la 3ª y 4ª) — con 4 tan estrechas el blur se veía como una mancha uniforme y el
 * texto no se leía; el resto de filas de la app también achican el número de tarjetas visibles
 * en vez de apretarlas todas.
 */

export type TeaserItem = { thumbnailUrl: string; title: string; tag?: string }

const fakeThumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 55%, 42%), hsl(${hue + 25}, 60%, 22%))`,
})

const FakeBackdrop = ({ items = [] }: { items?: TeaserItem[] }) => {
  const cards = items.slice(0, 4)
  if (cards.length === 0) {
    return <div aria-hidden className="pointer-events-none absolute inset-0 select-none blur-xl" style={fakeThumbStyle(hueFor("teaser-fallback"))} />
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {/* Miniaturas: mucho blur, para que no se pueda reconocer cuáles son. Sobredimensionada
          solo por arriba (-top-8, no afecta al ancho de las columnas). */}
      <div className="absolute inset-x-0 -top-8 bottom-20 flex gap-4 blur-lg">
        {cards.map((card, i) => (
          <img
            key={card.thumbnailUrl + i}
            src={card.thumbnailUrl}
            alt=""
            loading="lazy"
            className={`h-full min-w-0 flex-1 rounded-xl object-cover ${i >= 2 ? "hidden sm:block" : ""}`}
          />
        ))}
      </div>
      {/* Título + tag reales debajo de cada una, en su propia capa con mucho menos blur (texto
          tan fino no sobrevive al mismo blur-lg de las miniaturas). Mismo inset-x-0 y mismo
          gap-4 que la fila de arriba, para que las columnas midan y empiecen exactamente igual. */}
      <div className="absolute inset-x-0 bottom-6 flex gap-4 blur-sm">
        {cards.map((card, i) => (
          <div key={card.title + i} className={`min-w-0 flex-1 space-y-1 ${i >= 2 ? "hidden sm:block" : ""}`}>
            <p className="truncate text-sm font-medium text-white">{card.title}</p>
            {card.tag && <p className="truncate text-[11px] text-neon-cyan/70">#{card.tag}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

const LockedTeaser = ({ message, items }: { message: string; items?: TeaserItem[] }) => {
  const { t } = useI18n()
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-xl">
      <FakeBackdrop items={items} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-midnight/55 p-4 text-center">
        <Lock className="h-5 w-5 text-white/70" />
        <p className="max-w-xs text-sm text-white/80">{message}</p>
        <Link
          to="/app/precios"
          className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight transition hover:brightness-110"
        >
          {t("locked.cta", "Ver planes")}
        </Link>
      </div>
    </div>
  )
}

export default LockedTeaser
