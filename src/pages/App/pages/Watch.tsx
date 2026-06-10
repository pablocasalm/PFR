import { useSearchParams } from "react-router-dom"
import Clip from "./Clip"
import Video from "./Video"

/**
 * Watch — Visor unificado en /app/watch.
 * Decide qué mostrar según el query param, sin ensuciar la ruta:
 *   - ?v=<id> → análisis completo (Video)
 *   - ?c=<id> → clip corto (Clip)
 * Por defecto (sin params) muestra el clip.
 */
const Watch = () => {
  const [params] = useSearchParams()
  return params.has("v") ? <Video /> : <Clip />
}

export default Watch
