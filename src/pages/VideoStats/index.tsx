import { useMemo } from "react"
import { useParams } from "react-router-dom"
import PageShell from "../../components/layout/PageShell"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { getClipById } from "../../lib/api/clips"

type VideoStatsProps = {
  contentType?: "clip" | "video"
}

const VideoStats = ({ contentType }: VideoStatsProps) => {
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
                Stats
              </Badge>
              <Badge>
                {clip ? (resolvedContentType === "video" ? "Video" : "Clip") : "Sin datos"}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">
              Rendimiento del contenido
            </h1>
            <p className="max-w-2xl text-sm text-white/60">
              Visualiza la actividad, retencion y engagement para optimizar tus proximas publicaciones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">Descargar reporte</Button>
            <Button>Compartir</Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Reproducciones", value: "38.2K" },
                { label: "Tiempo medio", value: "1m 54s" },
                { label: "Retencion", value: "61%" },
                { label: "Compartidos", value: "1.2K" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-neon-cyan/70">+12% vs. semana pasada</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Retencion por minutos</h2>
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  Ultimos 7 dias
                </span>
              </div>
              <div className="mt-4 grid gap-3">
                {[
                  { label: "0-30s", value: 82 },
                  { label: "30-60s", value: 68 },
                  { label: "1-2m", value: 54 },
                  { label: "2m+", value: 39 },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-neon-cyan"
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Momentos destacados</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  { time: "00:18", label: "Pico de retencion" },
                  { time: "01:04", label: "Mayor repeticion" },
                  { time: "01:42", label: "Mas compartido" },
                  { time: "02:12", label: "Caida notable" },
                ].map((item) => (
                  <div
                    key={item.time}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70"
                  >
                    <span className="text-white">{item.time}</span> · {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Resumen</h2>
              <div className="mt-3 space-y-3 text-sm text-white/70">
                <p>{clip?.title ?? "Contenido sin titulo"}</p>
                <p>Duracion: 1m 48s</p>
                <p>Estado: Programado para 14 feb 2026</p>
                <p>Ultima actualizacion: hace 3 dias</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Audiencia</h2>
              <div className="mt-3 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>España</span>
                  <span>44%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>LatAm</span>
                  <span>31%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Europa</span>
                  <span>18%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Otros</span>
                  <span>7%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Engagement</h2>
              <div className="mt-3 space-y-2 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Me gusta</span>
                  <span>3.1K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Comentarios</span>
                  <span>412</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Guardados</span>
                  <span>980</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">Recomendaciones</h2>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>Publica el siguiente clip en las proximas 48h.</li>
                <li>Mejora la retencion antes de 30s con un hook mas rapido.</li>
                <li>Prueba una miniatura con texto mas corto.</li>
              </ul>
            </div>
          </aside>
        </section>
      </PageShell>
    </main>
  )
}

export default VideoStats
