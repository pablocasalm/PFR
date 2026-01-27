import type { ReactNode } from "react"

type PageShellProps = {
  children: ReactNode
  className?: string
}

const PageShell = ({ children, className = "" }: PageShellProps) => (
  <section
    className={`mx-auto w-full max-w-[1800px] px-3 md:px-5 lg:px-7 ${className}`}
  >
    {children}
  </section>
)

export default PageShell
