import { Plus, Check } from "lucide-react"
import type { ContentItem } from "../api/types"
import { useSavedItems, isSaved, toggleSavedItem } from "./store"

/**
 * Botón "Mi Lista" reutilizable (§9.4): selector de estado guardar/quitar.
 * - variant "pill": texto + icono (Hero, detalles).
 * - variant "icon": solo icono, para superponer en miniaturas de tarjetas.
 * Frena la navegación cuando va dentro de un <Link>.
 */
type Variant = "pill" | "icon"

const SaveButton = ({ item, variant = "icon" }: { item: ContentItem; variant?: Variant }) => {
  useSavedItems() // suscripción para re-render al cambiar el estado guardado
  const saved = isSaved(item.id)

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleSavedItem(item)
  }

  const label = saved ? "En Mi Lista" : "Mi Lista"

  if (variant === "pill") {
    return (
      <button
        onClick={onClick}
        aria-pressed={saved}
        className={`flex items-center gap-2.5 text-sm font-semibold transition ${
          saved ? "text-neon-cyan" : "text-white hover:text-white/80"
        }`}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border ${
            saved ? "border-neon-cyan bg-neon-cyan/10" : "border-white/40"
          }`}
        >
          {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition ${
        saved
          ? "border-neon-cyan bg-neon-cyan text-midnight"
          : "border-white/30 bg-black/50 text-white hover:bg-black/70"
      }`}
    >
      {saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  )
}

export default SaveButton
