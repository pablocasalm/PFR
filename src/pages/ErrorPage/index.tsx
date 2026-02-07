import { Link, useLocation } from "react-router-dom"
import PageShell from "../../components/layout/PageShell"
import { buttonClasses } from "../../components/ui/Button"

const ErrorPage = () => {
  const location = useLocation()
  const state = location.state as { code?: number; title?: string; message?: string } | null

  const code = state?.code ?? 404
  const title = state?.title ?? "Ocurrió un error"
  const message =
    state?.message ??
    "La pagina no esta disponible o la ruta no existe. Vuelve al panel principal."

  return (
    <div className="min-h-screen bg-film-room text-white">
      <main className="pb-16 pt-20">
        <PageShell className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">{code}</p>
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="max-w-md text-white/60">{message}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/app" className={buttonClasses("primary")}>
              Ir al panel
            </Link>
            <Link to="/login" className={buttonClasses("secondary")}>
              Ir a login
            </Link>
          </div>
        </PageShell>
      </main>
    </div>
  )
}

export default ErrorPage
