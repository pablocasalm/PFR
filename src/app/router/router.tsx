import { createBrowserRouter } from "react-router-dom"
import AppLayout from "../layout/AppLayout"
import AuthLayout from "../layout/AuthLayout"
import HomeShorts from "../../pages/HomeShorts"
import Clip from "../../pages/Clip"
import Analysis from "../../pages/Analysis"
import Colecciones from "../../pages/Colecciones"
import Guardados from "../../pages/Guardados"
import Perfil from "../../pages/Perfil"
import Login from "../../pages/Login"
import Register from "../../pages/Register"
import RequireAuth from "./RequireAuth"
import Explorar from "../../pages/Explorar"
import Landing from "../../pages/Landing"
import Publicar from "../../pages/Publicar"
import MisVideos from "../../pages/MisVideos"
import VideoStats from "../../pages/VideoStats"
import VideoEdit from "../../pages/VideoEdit"

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Explorar /> },
      { path: "explorar", element: <Explorar /> },
      { path: "clip/:id", element: <Clip /> },
      { path: "video/:id", element: <Analysis /> },
      { path: "analisis/:id", element: <Analysis /> },
      { path: "colecciones", element: <Colecciones /> },
      { path: "guardados", element: <Guardados /> },
      { path: "publicar", element: <Publicar /> },
      { path: "mis-videos", element: <MisVideos /> },
      { path: "perfil", element: <Perfil /> },
    ],
  },
  {
    path: "/clips",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <HomeShorts /> }],
  },
  {
    path: "/clip/:id",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <Clip /> }],
  },
  {
    path: "/clip/:id/stats",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <VideoStats /> }],
  },
  {
    path: "/clip/:id/editar",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <VideoEdit /> }],
  },
  {
    path: "/video/:id",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <Analysis /> }],
  },
  {
    path: "/video/:id/stats",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <VideoStats /> }],
  },
  {
    path: "/video/:id/editar",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <VideoEdit /> }],
  },
  {
    path: "/analisis/:id",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ index: true, element: <Analysis /> }],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
    ],
  },
])

export default router
