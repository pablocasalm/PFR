import { useMemo } from "react"
import PageShell from "../../components/layout/PageShell"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { getClips } from "../../lib/api/clips"

const Analiticas = () => {
  const clips = useMemo(() => getClips(), [])

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="solid" className="bg-neon-lime text-midnight">
              Analiticas
            </Badge>
            <Badge>Resumen general</Badge>
          </div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Panel de rendimiento</h1>
          <p className="max-w-2xl text-sm text-white/60">
            Vista global de tus publicaciones, estado y crecimiento del canal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary">Descargar informe</Button>
          <Button>Compartir panel</Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Reproducciones", value: "214K" },
          { label: "Seguidores nuevos", value: "+1.2K" },
          { label: "Retencion media", value: "58%" },
          { label: "CTR miniaturas", value: "4.8%" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{item.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
            <p className="mt-1 text-xs text-neon-cyan/70">+8% ultimos 7 dias</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Contenido reciente</h2>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">Ultimos 30 dias</span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              {
                title: "Bandeja cruzada para abrir la pista",
                status: "Publicado",
                note: "Hace 2 dias",
              },
              {
                title: "Patron defensa + globo",
                status: "Programado",
                note: "Programado para 14 feb 2026",
              },
              {
                title: "Analisis semifinal Tapia/Coello",
                status: "Borrador",
                note: "Guardado ayer",
              },
            ].map((item, index) => {
              const clip = clips[index]
              return (
                <div
                  key={item.title}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-20 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      {clip?.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/40">
                          Sin miniatura
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white">{item.title}</p>
                      <p className="text-white/50">{item.note}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                      item.status === "Publicado"
                        ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
                        : item.status === "Programado"
                          ? "border-neon-lime/40 bg-neon-lime/10 text-neon-lime"
                          : "border-white/20 bg-white/5 text-white/70"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Audiencia objetivo</h3>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <p>Jugadores intermedios y avanzados.</p>
              <p>Mayor interes en analisis tactico.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Alertas</h3>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>Un clip supero el 70% de retencion.</li>
              <li>Prueba una miniatura mas corta en el proximo video.</li>
              <li>Publica otro analisis antes del 16 feb 2026.</li>
            </ul>
          </div>
        </aside>
      </section>
    </PageShell>
  </main>
  )
}

export default Analiticas
