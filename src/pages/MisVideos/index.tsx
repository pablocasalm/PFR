import PageShell from "../../components/layout/PageShell"
import VideoFeed from "../../components/video/VideoFeed"
import { getClips } from "../../lib/api/clips"

const MisVideos = () => {
  const clips = getClips()
  const clipItems = clips.slice(0, Math.ceil(clips.length / 2))
  const videoItems = clips.slice(Math.ceil(clips.length / 2))

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.35em] text-neon-cyan/70">Studio</p>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Mis videos</h1>
            <p className="max-w-2xl text-sm text-white/60">
              Gestiona clips, videos, borradores y rendimiento sin salir del panel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Nuevo clip
            </button>
            <button className="focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Nuevo video
            </button>
            <button className="focus-ring rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">
              Ir a publicar
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Clips publicados", value: clipItems.length },
                { label: "Videos publicados", value: videoItems.length },
                { label: "Borradores", value: 3 },
                { label: "Programados", value: 2 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-2">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Clips publicados</h2>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                    {clipItems.length} clips
                  </span>
                </div>
                <VideoFeed
                  clips={clipItems}
                  layout="grid"
                  cardTarget="clip"
                  className="gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Videos publicados</h2>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                    {videoItems.length} videos
                  </span>
                </div>
                <VideoFeed
                  clips={videoItems}
                  layout="grid"
                  cardTarget="video"
                  className="gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
                />
              </section>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Programados</h3>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                {[
                  "Viernes · 20:30 · 1 clip",
                  "Domingo · 12:00 · 1 video",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Borradores</h3>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                {["Borrador: Bandeja cruzada", "Borrador: Plan de juego R3"].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Rendimiento 7 dias</h3>
              <div className="mt-3 grid gap-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Reproducciones</span>
                  <span className="text-white">12.4K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tiempo medio</span>
                  <span className="text-white">1m 42s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nuevos seguidores</span>
                  <span className="text-white">+128</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="text-sm font-semibold text-white">Recomendaciones</h3>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>Publica 2 clips mas esta semana para mantener el ritmo.</li>
                <li>Los clips con bandeja tienen +18% de retencion.</li>
                <li>Programa el proximo video para domingo 12:00.</li>
              </ul>
            </div>
          </aside>
        </section>
      </PageShell>
    </main>
  )
}

export default MisVideos
