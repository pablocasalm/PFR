import type { HTMLAttributes } from "react"

type BadgeVariant = "solid" | "outline"

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  solid: "bg-neon-lime text-midnight",
  outline: "border border-white/20 text-white/80",
}

const Badge = ({ variant = "outline", className = "", ...props }: BadgeProps) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${variantStyles[variant]} ${className}`}
    {...props}
  />
)

export default Badge
