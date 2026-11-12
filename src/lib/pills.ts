import { useApi } from "./hooks/useApi"
import { getHome } from "./api/home"
import { getPills } from "./api/pills"
import type { ContentItem } from "./api/types"

/**
 * Píldoras para la fila de Inicio y el reproductor (/app/pildoras). Mientras no haya ninguna
 * publicada (o el backend publicado todavía no tenga /api/pills), clips de Inicio hacen de
 * píldoras para poder ver el prototipo: `standIns` lo indica.
 */
/**
 * Interruptor de las píldoras para los usuarios (tarjetas #134/#136). Apagado por defecto: sin
 * `VITE_PILLS_ENABLED=true` (en Netlify o en .env.local) no sale ninguna entrada a las píldoras
 * (fila de Inicio, botón de Explorar, sugerencias del test, fila de Mi Lista). Publicar una
 * píldora (solo administradores) funciona siempre, para ir subiéndolas antes de lanzarlas.
 */
export const PILLS_ENABLED = import.meta.env.VITE_PILLS_ENABLED === "true"

export const usePills = () => {
  const pills = useApi(() => (PILLS_ENABLED ? getPills().catch(() => [] as ContentItem[]) : Promise.resolve([] as ContentItem[])), [], "pills")
  const home = useApi(getHome, [], "home")
  if (!PILLS_ENABLED) return { items: [] as ContentItem[], standIns: false, loading: false }
  const real = pills.data ?? []
  if (real.length > 0) return { items: real, standIns: false, loading: false }
  const standIns = [...(home.data?.newThisWeek ?? []), ...(home.data?.mostViewedThisWeek ?? [])].filter(
    (item, i, all) => item.type === "clip" && all.findIndex((x) => x.id === item.id) === i,
  )
  return { items: standIns, standIns: true, loading: pills.loading || home.loading }
}
