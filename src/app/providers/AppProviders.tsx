import type { ReactNode } from "react"
import { AuthProvider } from "./AuthProvider"
import { BookmarkProvider } from "./BookmarkProvider"
import { EntitlementProvider } from "./EntitlementProvider"

type AppProvidersProps = {
  children: ReactNode
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <AuthProvider>
    <EntitlementProvider>
      <BookmarkProvider>{children}</BookmarkProvider>
    </EntitlementProvider>
  </AuthProvider>
)

export default AppProviders
