import { Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Escaparate borroso + CTA para una sección que no está en el tier actual (§rediseño Club/Coach).
 * No llama nunca a la API propia de la sección bloqueada — el backend no manda esos datos a
 * quien no puede verlos (RequireTier).
 *
 * Imita la tarjeta real de "Recomendado para ti este mes" (PlanHomeCard, §El plan del mes): la
 * frase de introducción, las pestañas de situaciones, el título con su descripción y la fila de
 * clips — todo difuminado, con el candado y el CTA encima. Así quien no tiene Club ve QUÉ se
 * está perdiendo con la misma forma que tendrá cuando lo tenga, no una fila genérica.
 *
 * Nada de lo que se ve es el plan real: los textos son frases de relleno fijas y las miniaturas
 * vienen de contenido que SÍ es público para el tier actual (p. ej. "Nuevo esta semana" de
 * Inicio). Quien llama baraja miniaturas y títulos por separado, para que el texto no sirva
 * para adivinar qué vídeo es. El fondo va en flujo normal (no absoluto), así la caja mide lo
 * mismo que la tarjeta real en cada ancho de pantalla. Miniaturas con mucho blur; el texto, en
 * capas con menos blur (un texto tan fino no sobrevive al blur de las miniaturas). 2 columnas
 * en móvil y 4 desde `sm`, como el resto de filas de la app.
 */

export type TeaserItem = { thumbnailUrl: string; title: string; tag?: string }

const fakeThumbStyle = (hue: number) => ({
  background: `linear-gradient(135deg, hsl(${hue}, 55%, 42%), hsl(${hue + 25}, 60%, 22%))`,
})

const FakeBackdrop = ({ items = [] }: { items?: TeaserItem[] }) => {
  const { t } = useI18n()
  const cards = items.slice(0, 4)
  const tabs = [1, 2, 3].map((n) => t("locked.plan.tab", "Situación {n} del mes", { n }))
  return (
    <div aria-hidden className="pointer-events-none select-none">
      <p className="mb-4 text-sm text-white/70 blur-[3px]">
        {t("locked.plan.intro", "3 situaciones de la masterclass de este mes. Elige una y fíjate en qué se repite.")}
      </p>
      <div className="mb-5 grid grid-cols-3 gap-2 blur-[3px] sm:flex">
        {tabs.map((label, i) => (
          <span
            key={label}
            className={`rounded-lg border px-2.5 py-2 text-xs font-semibold leading-tight sm:px-4 sm:text-sm ${
              i === 0 ? "border-neon-cyan/60 bg-neon-cyan/15 text-white" : "border-white/10 bg-white/[0.03] text-white/60"
            }`}
          >
            {label}
          </span>
        ))}
      </div>
      <p className="font-display text-lg font-bold leading-snug text-white blur-[4px]">
        {t("locked.plan.title", "La situación en la que trabajamos este mes")}
      </p>
      <p className="mb-4 mt-1.5 max-w-3xl text-sm leading-relaxed text-white/70 blur-[3px]">
        {t("locked.plan.description", "Qué tienes que reconocer en tu partido y qué clips ver para identificarlo cuando te pase a ti en pista.")}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(cards.length > 0 ? cards : [null, null, null, null]).map((card, i) => (
          <div key={i} className={i >= 2 ? "hidden sm:block" : ""}>
            {card ? (
              <img src={card.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full rounded-xl object-cover blur-lg" />
            ) : (
              <div className="aspect-video w-full rounded-xl blur-lg" style={fakeThumbStyle(hueFor(`teaser-${i}`))} />
            )}
            {card && (
              <div className="mt-3 space-y-1 blur-sm">
                <p className="truncate text-sm font-medium text-white">{card.title}</p>
                {card.tag && <p className="truncate text-[11px] text-neon-cyan/70">#{card.tag}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const LockedTeaser = ({ message, items }: { message: string; items?: TeaserItem[] }) => {
  const { t } = useI18n()
  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      <FakeBackdrop items={items} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-midnight/55 p-4 text-center">
        <Lock className="h-5 w-5 text-white/70" />
        <p className="max-w-sm text-sm text-white/85">{message}</p>
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
