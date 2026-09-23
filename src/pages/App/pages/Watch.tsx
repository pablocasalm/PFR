import { useSearchParams } from "react-router-dom"
import Clip from "./Clip"
import Video from "./Video"
import Session from "./Session"

/**
 * Watch — Visor unificado en /app/watch.
 * Decide qué mostrar según el query param, sin ensuciar la ruta:
 *   - ?v=<id> → análisis completo (Video)
 *   - ?s=<id> → sesión táctica mensual grabada (Session, §Club hub) — no es un "clip" corto,
 *     rama propia y explícita, no cae en Clip si algo falla.
 *   - ?c=<id> → clip corto (Clip)
 * Por defecto (sin params) muestra el clip.
 */
const Watch = () => {
  const [params] = useSearchParams()
  if (params.has("v")) return <Video />
  if (params.has("s")) return <Session />
  return <Clip />
}

export default Watch
