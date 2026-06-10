import { Suspense, lazy } from "react"
import { Navigate, createBrowserRouter } from "react-router-dom"

const AppLayout = lazy(() => import("../../pages/App"))
const Inicio = lazy(() => import("../../pages/App/pages/Inicio"))
const Explorar = lazy(() => import("../../pages/App/pages/Explorar"))
const MiLista = lazy(() => import("../../pages/App/pages/MiLista"))
const MiJuego = lazy(() => import("../../pages/App/pages/MiJuego"))
const Watch = lazy(() => import("../../pages/App/pages/Watch"))
const Search = lazy(() => import("../../pages/App/pages/Search"))

const loadingFallback = <div className="p-6 text-sm text-neutral-500">Cargando...</div>

const withSuspense = (element: React.ReactElement) => (
  <Suspense fallback={loadingFallback}>{element}</Suspense>
)

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/app/inicio" replace /> },
  {
    path: "/app",
    element: withSuspense(<AppLayout />),
    children: [
      { index: true, element: <Navigate to="/app/inicio" replace /> },
      { path: "inicio", element: withSuspense(<Inicio />) },
      { path: "explorar", element: withSuspense(<Explorar />) },
      { path: "mi-lista", element: withSuspense(<MiLista />) },
      { path: "mi-juego", element: withSuspense(<MiJuego />) },
      { path: "watch", element: withSuspense(<Watch />) },
      { path: "search", element: withSuspense(<Search />) },
    ],
  },
  { path: "*", element: <Navigate to="/app/inicio" replace /> },
])

export default router
