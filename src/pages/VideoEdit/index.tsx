import { useMemo } from "react"
import { useParams } from "react-router-dom"
import PageShell from "../../components/layout/PageShell"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import { getClipById } from "../../lib/api/clips"

type VideoEditProps = {
  contentType?: "clip" | "video"
}

const VideoEdit = ({ contentType }: VideoEditProps) => {
  const { id, clipId, videoId } = useParams()
  const resolvedId = clipId ?? videoId ?? id
  const resolvedContentType =
    contentType ?? (videoId ? "video" : "clip")
  const clip = useMemo(() => (resolvedId ? getClipById(resolvedId) : undefined), [resolvedId])

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="solid" className="bg-neon-cyan text-midnight">
                Editar
              </Badge>
              <Badge>
                {clip ? (resolvedContentType === "video" ? "Video" : "Clip") : "Sin datos"}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Editar contenido</h1>
            <p className="max-w-2xl text-sm text-white/60">
              Ajusta metadatos, visibilidad y materiales para mejorar el rendimiento.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">Guardar borrador</Button>
            <Button>Guardar cambios</Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Datos principales</h2>
              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Titulo
                  </label>
                  <Input defaultValue={clip?.title ?? ""} placeholder="Titulo del contenido" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Descripcion
                  </label>
                  <textarea
                    className="focus-ring min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40"
                    defaultValue={clip?.ideaKey ?? ""}
                    placeholder="Describe el contenido y contexto"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                      Idioma
                    </label>
                    <select className="focus-ring w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-sm text-white">
                      <option>Español</option>
                      <option>Ingles</option>
                      <option>Portugues</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                      Categoria
                    </label>
                    <select className="focus-ring w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-sm text-white">
                      <option>Tactica</option>
                      <option>Highlights</option>
                      <option>Coaching</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Miniatura</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-[160px_1fr]">
                <div className="aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={clip?.thumbnailUrl}
                    alt={clip?.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-white/70">
                    Sube una miniatura personalizada para aumentar la tasa de clic.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary">Subir miniatura</Button>
                    <Button variant="ghost">Generar con IA</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Etiquetas y colecciones</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Etiquetas
                  </label>
                  <Input placeholder="Bandeja, Remate, Defensa" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.3em] text-white/50">
                    Coleccion
                  </label>
                  <select className="focus-ring w-full appearance-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 pr-12 text-sm text-white">
                    <option>Selecciona una coleccion</option>
                    <option>Plan de juego</option>
                    <option>Finales memorables</option>
                    <option>Clips de estudio</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Visibilidad</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Publico", description: "Se muestra en la plataforma" },
                  { title: "Privado", description: "Solo accesible con la URL compartida" },
                  { title: "Oculto", description: "Solo visible para ti" },
                ].map((option) => (
                  <button
                    key={option.title}
                    type="button"
                    className="rounded-2xl border border-white/10 bg-black/40 p-3 text-left text-sm text-white/70 hover:border-neon-cyan"
                  >
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                    <p className="mt-1 text-xs text-white/60">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Estado</h2>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Publicacion</span>
                  <span className="text-white">Activa</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fecha</span>
                  <span className="text-white">Hace 3 dias</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="text-white">v2</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Programacion</h2>
              <div className="mt-3 space-y-3 text-sm text-white/70">
                <p>Proxima ventana recomendada:</p>
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Sabado · 12:00
                </div>
                <Button variant="secondary" className="w-full">
                  Programar publicacion
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Acciones</h2>
              <div className="mt-3 flex flex-col gap-2">
                <Button variant="ghost">Duplicar</Button>
                <Button variant="ghost">Mover a borradores</Button>
                <Button variant="ghost">Eliminar contenido</Button>
              </div>
            </div>
          </aside>
        </section>
      </PageShell>
    </main>
  )
}

export default VideoEdit
