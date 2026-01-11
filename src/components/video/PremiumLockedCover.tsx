import { Link } from "react-router-dom"
import Badge from "../ui/Badge"
import { buttonClasses } from "../ui/Button"

type PremiumLockedCoverProps = {
  thumbnailUrl: string
  title: string
  className?: string
  message?: string
}

const PremiumLockedCover = ({
  thumbnailUrl,
  title,
  className = "",
  message = "Hazte Premium para verlo",
}: PremiumLockedCoverProps) => (
  <div className={`relative overflow-hidden rounded-3xl border border-white/10 ${className}`}>
    <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/40 to-transparent" />
    <div className="absolute left-4 top-4">
      <Badge variant="solid" className="bg-neon-lime text-midnight">
        Premium
      </Badge>
    </div>
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span aria-hidden="true">🔒</span>
        <span>{message}</span>
      </div>
      <Link to="/perfil" className={buttonClasses("secondary")}>
        Hacerse Premium
      </Link>
    </div>
  </div>
)

export default PremiumLockedCover
