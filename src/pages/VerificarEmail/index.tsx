import { useState } from "react"
import PageShell from "../../components/layout/PageShell"
import Button from "../../components/ui/Button"
import { useAuth } from "../../app/providers/AuthProvider"

const VerificarEmail = () => {
  const { email } = useAuth()
  const [sentAt, setSentAt] = useState<string | null>(null)

  const handleResend = () => {
    const now = new Date()
    const time = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    setSentAt(time)
  }

  return (
    <main className="pb-16 pt-16">
    <PageShell className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Verificar email</h1>
          <p className="text-base text-white/70">
            Confirma tu correo para activar notificaciones y recuperar tu cuenta si lo necesitas.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left">
          <div className="space-y-3 text-sm text-white/70">
            <p>
              Enviamos un enlace de verificacion a
              <span className="text-white"> {email ?? "usuario@padelfilmroom.com"}</span>.
            </p>
            <p>Si no lo ves, revisa spam o vuelve a solicitarlo.</p>
            {sentAt ? (
              <p className="text-neon-cyan/80">Verificacion reenviada a las {sentAt}.</p>
            ) : (
              <p className="text-white/50">No has reenviado la verificacion en esta sesion.</p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={handleResend}>Reenviar verificacion</Button>
            <Button variant="secondary">Actualizar estado</Button>
          </div>
        </div>
      </div>
    </PageShell>
  </main>
)
}

export default VerificarEmail
