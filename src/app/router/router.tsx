import { Suspense, lazy } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"
import LoadingScreen from "../../lib/ui/LoadingScreen"

const AppLayout = lazy(() => import("../../pages/App"))
const Inicio = lazy(() => import("../../pages/App/pages/Inicio"))
const Explorar = lazy(() => import("../../pages/App/pages/Explorar"))
const MiLista = lazy(() => import("../../pages/App/pages/MiLista"))
const MiJuego = lazy(() => import("../../pages/App/pages/MiJuego"))
const MiCuenta = lazy(() => import("../../pages/App/pages/MiCuenta"))
const ComoFunciona = lazy(() => import("../../pages/App/pages/ComoFunciona"))
const Watch = lazy(() => import("../../pages/App/pages/Watch"))
const Search = lazy(() => import("../../pages/App/pages/Search"))
const LoginPage = lazy(() => import("../../lib/auth/LoginPage"))
const ResetPasswordPage = lazy(() => import("../../lib/auth/ResetPasswordPage"))
const PlayerTestPage = lazy(() => import("../../lib/player/PlayerTestPage"))
const Publicar = lazy(() => import("../../pages/App/pages/Publicar"))
const Editar = lazy(() => import("../../pages/App/pages/Editar"))
const AdminInvites = lazy(() => import("../../pages/App/pages/AdminInvites"))
const AdminFeedback = lazy(() => import("../../pages/App/pages/AdminFeedback"))
const AdminNoticias = lazy(() => import("../../pages/App/pages/AdminNoticias"))

const RequireAuth = lazy(() => import("../../lib/auth/RequireAuth"))
const RequirePublisher = lazy(() => import("../../lib/auth/RequirePublisher"))
const RequireAdmin = lazy(() => import("../../lib/auth/RequireAdmin"))

const loadingFallback = <LoadingScreen />

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={loadingFallback}>{element}</Suspense>
)

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/inicio" replace /> },
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/register", element: withSuspense(<LoginPage />) },
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
      { path: "mi-cuenta", element: withSuspense(<MiCuenta />) },
      { path: "como-funciona", element: withSuspense(<ComoFunciona />) },
      { path: "watch", element: withSuspense(<Watch />) },
      { path: "search", element: withSuspense(<Search />) },
      { path: "publicar", element: withSuspense(<RequirePublisher><Publicar /></RequirePublisher>) },
      { path: "editar/:type/:id", element: withSuspense(<RequirePublisher><Editar /></RequirePublisher>) },
      { path: "admin/invitaciones", element: withSuspense(<RequireAdmin><AdminInvites /></RequireAdmin>) },
      { path: "admin/reportes", element: withSuspense(<RequireAdmin><AdminFeedback /></RequireAdmin>) },
      { path: "admin/noticias", element: withSuspense(<RequireAdmin><AdminNoticias /></RequireAdmin>) },
    ],
  },
  { path: "*", element: <Navigate to="/app/inicio" replace /> },
])

export default router
