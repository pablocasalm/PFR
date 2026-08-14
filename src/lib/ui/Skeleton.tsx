import CardRow from "./CardRow"

/**
 * Primitivas de "skeleton" (esqueleto de carga). Bloques con pulso sutil que imitan el layout
 * mientras llegan los datos, en vez de un "Cargando..." plano. Respetan prefers-reduced-motion.
 */

/** Bloque base. Ajusta tamaño/forma con className (h-*, w-*, rounded-*, aspect-*). */
export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-white/[0.06] motion-safe:animate-pulse ${className}`} />
)

/** Tarjeta de contenido (miniatura 16:9 + dos líneas de texto). */
export const CardSkeleton = () => (
  <div className="space-y-2">
    <Skeleton className="aspect-video w-full rounded-xl" />
    <Skeleton className="h-3 w-3/4 rounded" />
    <Skeleton className="h-3 w-1/2 rounded" />
  </div>
)

/** Fila de N tarjetas, con el mismo carrusel/grid responsive que usan las páginas. */
export const CardGridSkeleton = ({ count = 5 }: { count?: number }) => (
  <CardRow>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </CardRow>
)
