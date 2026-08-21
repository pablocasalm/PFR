import { Link } from "react-router-dom"
import { Pencil } from "lucide-react"
import { useAuth, canPublish } from "../../../lib/auth/store"

/** Enlace "Editar" (v1 básica) visible solo para quien puede publicar. */
const EditContentLink = ({ type, id }: { type: "clip" | "analysis"; id: string }) => {
  const { user } = useAuth()
  if (!canPublish(user)) return null

  return (
    <Link
      to={`/app/editar/${type}/${id}`}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-white/40 transition hover:text-neon-cyan"
    >
      <Pencil className="h-3.5 w-3.5" /> Editar
    </Link>
  )
}

export default EditContentLink
