import Button from "../../components/ui/Button"
import { useAuth } from "../../app/providers/AuthProvider"
import { useNavigate } from "react-router-dom"

const Perfil = () => {
  const { email, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <main className="px-4 pb-16 pt-10 md:px-8">
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Perfil</h1>
          <p className="text-base text-white/70">Gestiona tu acceso y tus sesiones activas.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Email</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {email || "usuario@padelfilmroom.com"}
          </p>
        </div>
        <Button onClick={handleLogout} variant="secondary">
          Cerrar sesión
        </Button>
      </section>
    </main>
  )
}

export default Perfil
