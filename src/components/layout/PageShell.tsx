import type { ReactNode } from "react"
import AppContainer from "../ui/AppContainer"

type PageShellProps = {
  children: ReactNode
  className?: string
}

const PageShell = ({ children, className = "" }: PageShellProps) => (
  <AppContainer className={className}>{children}</AppContainer>
)

export default PageShell
