import { Check } from "lucide-react"

/** Insignia de "Visto" para la esquina inferior-izquierda de una miniatura (§ estilo YouTube). */
const WatchedBadge = () => (
  <span
    aria-label="Visto"
    title="Visto"
    className="absolute bottom-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-neon-lime/90 text-midnight shadow"
  >
    <Check className="h-3 w-3" strokeWidth={3} />
  </span>
)

export default WatchedBadge
