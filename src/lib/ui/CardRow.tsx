import { Children } from "react"

/**
 * Fila de tarjetas: carrusel horizontal con scroll táctil en móvil (< sm, patrón
 * "Netflix web mobile"); rejilla normal desde `sm` (§responsive). `cols` fija las
 * columnas de la rejilla en escritorio y `itemWidth` el ancho de cada tarjeta en el
 * carrusel móvil (usa vw para dejar asomar la siguiente tarjeta).
 */
const CardRow = ({
  children,
  itemWidth = "w-[40vw]",
  cols = "sm:grid-cols-3 lg:grid-cols-5",
}: {
  children: React.ReactNode
  itemWidth?: string
  cols?: string
}) => (
  <div
    className={`-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scrollbar-hide px-4 pb-1 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 ${cols}`}
  >
    {Children.map(children, (child) => (
      <div className={`shrink-0 snap-start ${itemWidth} sm:w-auto sm:shrink`}>{child}</div>
    ))}
  </div>
)

export default CardRow
