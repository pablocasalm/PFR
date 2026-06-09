import type { ReactNode } from "react"

type CardProps = {
  children: ReactNode
  className?: string
}

const Card = ({ children, className = "" }: CardProps) => (
  <div
    className={`bg-zinc-900 border border-white/10 rounded-xl transition-all transition-transform duration-200 hover:scale-[1.02] hover:border-white/20 ${className}`}
  >
    {children}
  </div>
)

export default Card
