import { Suspense, lazy } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"

const AppLayout = lazy(() => import("../../pages/App"))
const Inicio = lazy(() => import("../../pages/App/pages/Inicio"))
const Explorar = lazy(() => import("../../pages/App/pages/Explorar"))
const MiLista = lazy(() => import("../../pages/App/pages/MiLista"))
const MiJuego = lazy(() => import("../../pages/App/pages/MiJuego"))
const ComoFunciona = lazy(() => import("../../pages/App/pages/ComoFunciona"))
const Watch = lazy(() => import("../../pages/App/pages/Watch"))
const Search = lazy(() => import("../../pages/App/pages/Search"))
const LoginPage = lazy(() => import("../../lib/auth/LoginPage"))
const ResetPasswordPage = lazy(() => import("../../lib/auth/ResetPasswordPage"))
const PlayerTestPage = lazy(() => import("../../lib/player/PlayerTestPage"))
const Publicar = lazy(() => import("../../pages/App/pages/Publicar"))
const AdminInvites = lazy(() => import("../../pages/App/pages/AdminInvites"))

const RequireAuth = lazy(() => import("../../lib/auth/RequireAuth"))
const RequirePublisher = lazy(() => import("../../lib/auth/RequirePublisher"))
const RequireAdmin = lazy(() => import("../../lib/auth/RequireAdmin"))

const loadingFallback = <div className="p-6 text-sm text-neutral-500">Cargando...</div>

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={loadingFallback}>{element}</Suspense>
)

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/inicio" replace /> },
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/reset-password", element: withSuspense(<ResetPasswordPage />) },
  // ⚠️ Solo dev: prueba del reproductor sin backend.
  ...(import.meta.env.DEV ? [{ path: "/dev/player", element: withSuspense(<PlayerTestPage />) }] : []),
  {
    // Toda la zona /app está detrás de sesión: sin token, RequireAuth manda a /login.
    path: "/app",
    element: withSuspense(
      <RequireAuth>
        <AppLayout />
      </RequireAuth>,
    ),
    children: [
      { index: true, element: <Navigate to="/app/inicio" replace /> },
      { path: "inicio", element: withSuspense(<Inicio />) },
      { path: "explorar", element: withSuspense(<Explorar />) },
      { path: "mi-lista", element: withSuspense(<MiLista />) },
      { path: "mi-juego", element: withSuspense(<MiJuego />) },
      { path: "como-funciona", element: withSuspense(<ComoFunciona />) },
      { path: "watch", element: withSuspense(<Watch />) },
      { path: "search", element: withSuspense(<Search />) },
      { path: "publicar", element: withSuspense(<RequirePublisher><Publicar /></RequirePublisher>) },
      { path: "admin/invitaciones", element: withSuspense(<RequireAdmin><AdminInvites /></RequireAdmin>) },
    ],
  },
  { path: "*", element: <Navigate to="/app/inicio" replace /> },
])

export default router
