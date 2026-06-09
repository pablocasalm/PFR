import type { ReactNode } from "react"

type SectionProps = {
  children: ReactNode
  className?: string
}

const Section = ({ children, className = "" }: SectionProps) => (
  <section className={`py-10 lg:py-14 ${className}`}>{children}</section>
)

export default Section
