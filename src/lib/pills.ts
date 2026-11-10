import { useApi } from "./hooks/useApi"
import { getHome } from "./api/home"
import { getPills } from "./api/pills"
import type { ContentItem } from "./api/types"

/**
 * Píldoras para la fila de Inicio y el reproductor (/app/pildoras). Mientras no haya ninguna
 * publicada (o el backend publicado todavía no tenga /api/pills), clips de Inicio hacen de
 * píldoras para poder ver el prototipo: `standIns` lo indica.
 */
export const usePills = () => {
  const pills = useApi(() => getPills().catch(() => [] as ContentItem[]), [], "pills")
  const home = useApi(getHome, [], "home")
  const real = pills.data ?? []
  if (real.length > 0) return { items: real, standIns: false, loading: false }
  const standIns = [...(home.data?.newThisWeek ?? []), ...(home.data?.mostViewedThisWeek ?? [])].filter(
    (item, i, all) => item.type === "clip" && all.findIndex((x) => x.id === item.id) === i,
  )
  return { items: standIns, standIns: true, loading: pills.loading || home.loading }
}
