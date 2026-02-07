import PageShell from "../../components/layout/PageShell"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"

const CambiarContrasena = () => (
  <main className="pb-16 pt-16">
    <PageShell className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">Cambiar contraseña</h1>
          <p className="text-base text-white/70">
            Actualiza tu contraseña para mantener tu cuenta segura.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                Contraseña actual
              </label>
              <Input type="password" placeholder="********" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                Nueva contraseña
              </label>
              <Input type="password" placeholder="Minimo 8 caracteres" />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                Confirmar nueva contraseña
              </label>
              <Input type="password" placeholder="Repite la nueva contraseña" />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button>Guardar cambios</Button>
              <Button variant="secondary">Cancelar</Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  </main>
)

export default CambiarContrasena
