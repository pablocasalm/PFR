import type { ButtonHTMLAttributes } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseStyles =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300"

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-neon-cyan text-midnight shadow-glow hover:-translate-y-0.5 hover:bg-white",
  secondary:
    "bg-white/10 text-white hover:-translate-y-0.5 hover:bg-white/20",
  ghost:
    "border border-white/15 text-white/80 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white",
}

export const buttonClasses = (variant: ButtonVariant = "primary") =>
  `${baseStyles} ${variantStyles[variant]}`

const Button = ({ variant = "primary", className = "", ...props }: ButtonProps) => (
  <button className={`${buttonClasses(variant)} ${className}`} {...props} />
)

export default Button
