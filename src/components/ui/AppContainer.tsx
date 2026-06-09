import type { ReactNode } from "react"

type AppContainerProps = {
  children: ReactNode
  className?: string
}

const AppContainer = ({ children, className = "" }: AppContainerProps) => (
  <div className={`mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 ${className}`}>
    {children}
  </div>
)

export default AppContainer
