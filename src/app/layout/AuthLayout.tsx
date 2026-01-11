import { Outlet } from "react-router-dom"

const AuthLayout = () => (
  <div className="min-h-screen bg-film-room">
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-neon-cyan/70">Padel Film Room</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Streaming táctico</h1>
      </div>
      <div className="rounded-3xl border border-white/10 bg-midnight-soft/70 p-8 shadow-xl">
        <Outlet />
      </div>
    </div>
  </div>
)

export default AuthLayout
