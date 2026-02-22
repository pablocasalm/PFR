import { Suspense, lazy } from "react"
import { Navigate, createBrowserRouter, useParams } from "react-router-dom"
import RequireAuth from "./RequireAuth"

const AppLayout = lazy(() => import("../layout/AppLayout"))
const AuthLayout = lazy(() => import("../layout/AuthLayout"))
const HomeShorts = lazy(() => import("../../pages/HomeShorts"))
const Clip = lazy(() => import("../../pages/Clip"))
const ColeccionDetalle = lazy(() => import("../../pages/ColeccionDetalle"))
const Colecciones = lazy(() => import("../../pages/Colecciones"))
const Guardados = lazy(() => import("../../pages/Guardados"))
const Login = lazy(() => import("../../pages/Login"))
const Register = lazy(() => import("../../pages/Register"))
const Explorar = lazy(() => import("../../pages/Explorar"))
const Landing = lazy(() => import("../../pages/Landing"))
const LandingProvisional = lazy(() => import("../../pages/landing_provisional"))
const Publicar = lazy(() => import("../../pages/Publicar"))
const MisVideos = lazy(() => import("../../pages/MisVideos"))
const VideoStats = lazy(() => import("../../pages/VideoStats"))
const VideoEdit = lazy(() => import("../../pages/VideoEdit"))
const CambiarContrasena = lazy(() => import("../../pages/CambiarContrasena"))
const VerificarEmail = lazy(() => import("../../pages/VerificarEmail"))
const EditarPerfil = lazy(() => import("../../pages/EditarPerfil"))
const Analiticas = lazy(() => import("../../pages/Analiticas"))
const Mantenimiento = lazy(() => import("../../pages/Mantenimiento"))
const ErrorPage = lazy(() => import("../../pages/ErrorPage"))
const Perfil = lazy(() => import("../../pages/Perfil"))

const loadingFallback = (
  <div className="p-6 text-sm text-neutral-500">Cargando...</div>
)
const withSuspense = (element: JSX.Element) => (
  <Suspense fallback={loadingFallback}>{element}</Suspense>
)

const LegacyNavigate = ({ to }: { to: string }) => {
  const params = useParams()
  const path = to.replace(":id", params.id ?? "")
  return <Navigate to={path} replace />
}

const LegacyParamNavigate = ({ to, param }: { to: string; param: string }) => {
  const params = useParams()
  const value = params[param] ?? ""
  const path = to.replace(`:${param}`, value)
  return <Navigate to={path} replace />
}

const router = createBrowserRouter([
  {
    path: "/",
    element: withSuspense(<Landing />),
  },
  {
    path: "/newlanding",
    element: withSuspense(<LandingProvisional />),
  },
  {
    element: withSuspense(<AuthLayout />),
    children: [
      { path: "/login", element: withSuspense(<Login />) },
      { path: "/register", element: withSuspense(<Register />) },
      { path: "/forgot", element: withSuspense(<Login />) },
      { path: "/reset", element: withSuspense(<Login />) },
      { path: "/verify-email", element: withSuspense(<VerificarEmail />) },
    ],
  },
  {
    path: "/app",
    element: withSuspense(
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/explore" replace /> },
      { path: "explore", element: withSuspense(<Explorar />) },
      { path: "explore/section/:sectionId", element: withSuspense(<Explorar />) },
      { path: "search", element: withSuspense(<Explorar />) },
      { path: "clips", element: withSuspense(<HomeShorts />) },
      { path: "clips/:mode", element: withSuspense(<HomeShorts />) },
      {
        path: "watch/clip/:clipId",
        element: withSuspense(<Clip contentType="clip" mode="watch" />),
      },
      {
        path: "watch/video/:videoId",
        element: withSuspense(<Clip contentType="video" mode="watch" />),
      },
      {
        path: "watch/clip/:clipId/comments",
        element: withSuspense(<Clip contentType="clip" mode="watch" />),
      },
      {
        path: "watch/video/:videoId/comments",
        element: withSuspense(<Clip contentType="video" mode="watch" />),
      },
      {
        path: "watch/clip/:clipId/reactions",
        element: withSuspense(<Clip contentType="clip" mode="watch" />),
      },
      {
        path: "watch/video/:videoId/reactions",
        element: withSuspense(<Clip contentType="video" mode="watch" />),
      },
      {
        path: "clip/:clipId",
        element: withSuspense(<Clip contentType="clip" mode="detail" />),
      },
      {
        path: "video/:videoId",
        element: withSuspense(<Clip contentType="video" mode="detail" />),
      },
      { path: "collections", element: withSuspense(<Colecciones />) },
      { path: "collections/:collectionId", element: withSuspense(<ColeccionDetalle />) },
      { path: "collections/:collectionId/edit", element: withSuspense(<ColeccionDetalle />) },
      { path: "collections/:collectionId/add", element: withSuspense(<ColeccionDetalle />) },
      { path: "saved", element: withSuspense(<Guardados />) },
      { path: "saved/clips", element: withSuspense(<Guardados />) },
      { path: "saved/videos", element: withSuspense(<Guardados />) },
      { path: "saved/collections", element: withSuspense(<Guardados />) },
      { path: "my", element: withSuspense(<MisVideos />) },
      { path: "my/clips", element: withSuspense(<MisVideos />) },
      { path: "my/clips/:clipId", element: withSuspense(<VideoEdit contentType="clip" />) },
      { path: "my/videos", element: withSuspense(<MisVideos />) },
      { path: "my/videos/:videoId", element: withSuspense(<VideoEdit contentType="video" />) },
      { path: "publish", element: withSuspense(<Publicar />) },
      { path: "publish/clip", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/source", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/trim", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/details", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/captions", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/preview", element: withSuspense(<Publicar />) },
      { path: "publish/clip/:draftId/success", element: withSuspense(<Publicar />) },
      { path: "publish/video", element: withSuspense(<Publicar />) },
      { path: "publish/video/:draftId/upload", element: withSuspense(<Publicar />) },
      { path: "publish/video/:draftId/details", element: withSuspense(<Publicar />) },
      { path: "publish/video/:draftId/captions", element: withSuspense(<Publicar />) },
      { path: "publish/video/:draftId/preview", element: withSuspense(<Publicar />) },
      { path: "publish/video/:draftId/success", element: withSuspense(<Publicar />) },
      { path: "edit/clip/:clipId", element: withSuspense(<VideoEdit contentType="clip" />) },
      { path: "edit/clip/:clipId/details", element: withSuspense(<VideoEdit contentType="clip" />) },
      { path: "edit/clip/:clipId/captions", element: withSuspense(<VideoEdit contentType="clip" />) },
      { path: "edit/video/:videoId", element: withSuspense(<VideoEdit contentType="video" />) },
      { path: "edit/video/:videoId/details", element: withSuspense(<VideoEdit contentType="video" />) },
      { path: "edit/video/:videoId/captions", element: withSuspense(<VideoEdit contentType="video" />) },
      { path: "edit/video/:videoId/thumbnail", element: withSuspense(<VideoEdit contentType="video" />) },
      { path: "stats/clip/:clipId", element: withSuspense(<VideoStats contentType="clip" />) },
      { path: "stats/video/:videoId", element: withSuspense(<VideoStats contentType="video" />) },
      { path: "analytics", element: withSuspense(<Analiticas />) },
      {
        path: "analytics/item/clip/:clipId",
        element: withSuspense(<VideoStats contentType="clip" />),
      },
      {
        path: "analytics/item/video/:videoId",
        element: withSuspense(<VideoStats contentType="video" />),
      },
      { path: "account", element: withSuspense(<Perfil />) },
      { path: "account/profile", element: withSuspense(<EditarPerfil />) },
      { path: "account/security", element: withSuspense(<CambiarContrasena />) },
      { path: "account/notifications", element: withSuspense(<Perfil />) },
      { path: "account/playback", element: withSuspense(<Perfil />) },
      { path: "explorar", element: <Navigate to="/app/explore" replace /> },
      { path: "colecciones", element: <Navigate to="/app/collections" replace /> },
      {
        path: "colecciones/:collectionId",
        element: <LegacyParamNavigate to="/app/collections/:collectionId" param="collectionId" />,
      },
      { path: "guardados", element: <Navigate to="/app/saved" replace /> },
      { path: "publicar", element: <Navigate to="/app/publish" replace /> },
      { path: "mis-videos", element: <Navigate to="/app/my" replace /> },
      { path: "analiticas", element: <Navigate to="/app/analytics" replace /> },
      { path: "perfil", element: <Navigate to="/app/account" replace /> },
      { path: "editar-perfil", element: <Navigate to="/app/account/profile" replace /> },
      { path: "cambiar-contrasena", element: <Navigate to="/app/account/security" replace /> },
      { path: "verificar-email", element: <Navigate to="/verify-email" replace /> },
      { path: "help", element: withSuspense(<ErrorPage />) },
      { path: "not-found", element: withSuspense(<ErrorPage />) },
      { path: "*", element: withSuspense(<ErrorPage />) },
    ],
  },
  {
    path: "/clips",
    element: <Navigate to="/app/clips" replace />,
  },
  {
    path: "/clip/:id",
    element: <LegacyNavigate to="/app/watch/video/:id" />,
  },
  {
    path: "/clip/:id/stats",
    element: <LegacyNavigate to="/app/stats/video/:id" />,
  },
  {
    path: "/clip/:id/editar",
    element: <LegacyNavigate to="/app/edit/video/:id" />,
  },
  { path: "/mantenimiento", element: withSuspense(<Mantenimiento />) },
  { path: "/error", element: withSuspense(<ErrorPage />) },
  { path: "*", element: withSuspense(<ErrorPage />) },
])

export default router
