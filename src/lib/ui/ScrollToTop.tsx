import { useEffect } from "react"
import { useLocation } from "react-router-dom"

/**
 * Resetea el scroll al cambiar de pantalla — React Router no lo hace solo (a diferencia de
 * una navegación real de página). Se dispara solo con cambios de RUTA (pathname), no de query
 * params: hay pantallas donde el scroll es parte de la navegación (ej. "Siguiente clip" en
 * Watch, que solo cambia ?c=/?v=, o los filtros de Search) y forzarlo ahí rompería esa UX.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default ScrollToTop
