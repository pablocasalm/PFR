import { Children } from "react"

/**
 * Fila de tarjetas: carrusel horizontal con scroll táctil en móvil (< sm, patrón
 * "Netflix web mobile"); rejilla normal desde `sm` (§responsive). `cols` fija las
 * columnas de la rejilla en escritorio y `itemWidth` el ancho de cada tarjeta en el
 * carrusel móvil (usa vw para dejar asomar la siguiente tarjeta).
 *
 * Antes usaba el truco de margen negativo + padding en el propio contenedor con
 * scroll para "sangrar" hasta el borde de la pantalla — con scroll-snap activo, ese
 * padding no se respeta de forma fiable en Safari/iOS y la primera tarjeta quedaba
 * ligeramente desalineada respecto al resto del contenido (reporte de beta). El
 * carrusel nunca necesita llegar de verdad al borde físico, así que simplemente vive
 * dentro del padding normal de la página: mismo alineado que el título de la sección,
 * sin cálculos propios que puedan fallar.
 */
/** `max` (Nuevo esta semana, Vistos recientemente): como mucho esas tarjetas, en una sola fila —
 * con las columnas por defecto, en tableta solo las 3 primeras y en escritorio las 5; en el móvil
 * se deslizan todas. */
const CardRow = ({
  children,
  itemWidth = "w-[40vw]",
  cols = "sm:grid-cols-3 lg:grid-cols-5",
  max,
}: {
  children: React.ReactNode
  itemWidth?: string
  cols?: string
  max?: number
}) => (
  <div
    className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide pb-1 sm:grid sm:gap-4 sm:overflow-visible sm:pb-0 ${cols}`}
  >
    {Children.toArray(children)
      .slice(0, max)
      .map((child, i) => (
        <div key={i} className={`shrink-0 snap-start ${itemWidth} sm:w-auto sm:shrink ${max != null && i >= 3 ? "sm:hidden lg:block" : ""}`}>
          {child}
        </div>
      ))}
  </div>
)

export default CardRow
