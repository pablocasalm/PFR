import type { ReactNode } from "react"
import { AuthProvider } from "./AuthProvider"
import { BookmarkProvider } from "./BookmarkProvider"
import { EntitlementProvider } from "./EntitlementProvider"
import { PlayerProvider } from "./PlayerProvider"

type AppProvidersProps = {
  children: ReactNode
}

const AppProviders = ({ children }: AppProvidersProps) => (
  <AuthProvider>
    <EntitlementProvider>
      <BookmarkProvider>
        <PlayerProvider>{children}</PlayerProvider>
      </BookmarkProvider>
    </EntitlementProvider>
  </AuthProvider>
)

export default AppProviders
