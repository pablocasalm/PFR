import PageShell from "../../components/layout/PageShell"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"

const EditarPerfil = () => (
  <main className="pb-16 pt-16">
    <PageShell className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Editar perfil</h1>
        <p className="text-base text-white/70">
          Ajusta tu nombre publico, biografia y preferencias de contenido.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Nombre
                  </label>
                  <Input placeholder="Nombre" defaultValue="Pablo" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Apellido
                  </label>
                  <Input placeholder="Apellido" defaultValue="Casal" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Alias publico
                </label>
                <Input placeholder="@padelcoach" defaultValue="@padelfilmroom" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Bio
                </label>
                <textarea
                  className="focus-ring min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40"
                  placeholder="Cuenta en que te especializas, estilo de juego o enfoque del canal"
                  defaultValue="Analisis tactico del padel profesional."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Ciudad
                  </label>
                  <Input placeholder="Madrid" defaultValue="Madrid" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/60">
                    Pais
                  </label>
                  <Input placeholder="España" defaultValue="España" />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button>Guardar cambios</Button>
                <Button variant="secondary">Cancelar</Button>
              </div>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-white">Preferencias de contenido</h2>
            <p className="mt-2 text-sm text-white/50">
              Personaliza a quien sigues y que torneos te interesan.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Jugadores favoritos
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { name: "Tapia", image: "/Mniaturas/YanguasNieto.TapiaCoello.png" },
                    { name: "Coello", image: "/Mniaturas/LebronAusburger.TapiaCoello.png" },
                    { name: "Galan", image: "/Mniaturas/YanguasNieto.GalanChingo.png" },
                    { name: "Chingotto", image: "/Mniaturas/GalanChingo.TapiaCoello.png" },
                    { name: "Lebron", image: "/Mniaturas/Miniatura_Galan.Chingotto-vs-Tello.Alonso.PNG" },
                    { name: "Paquito", image: "/Mniaturas/SanchezJosemaria.GonzalezFernandez.png" },
                  ].map((player) => (
                    <button
                      key={player.name}
                      type="button"
                      className="group focus-ring overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"
                    >
                      <div className="relative h-24 w-full overflow-hidden">
                        <img
                          src={player.image}
                          alt={player.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                        <span>{player.name}</span>
                        <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/50">
                          Seguir
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Input placeholder="Anadir jugador favorito" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                  Torneos y circuitos
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {["Premier Padel", "A1 Padel", "Master Final", "Open 500"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Foto</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/40 text-lg text-white">
                PF
              </div>
              <div className="space-y-2">
                <button className="focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                  Subir foto
                </button>
                <p className="text-xs text-white/40">PNG o JPG. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Visibilidad</p>
            <p className="mt-3">
              Controla que datos son publicos en tus clips y analisis compartidos.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="focus-ring rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">
                Mostrar alias
              </button>
              <button className="focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Ocultar ciudad
              </button>
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  </main>
)

export default EditarPerfil
