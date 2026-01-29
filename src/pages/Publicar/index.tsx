import { useEffect, useRef, useState } from "react"
import PageShell from "../../components/layout/PageShell"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"

type SelectOption = {
  label: string
  value: string
}

type CustomSelectProps = {
  placeholder: string
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
}

const CustomSelect = ({ placeholder, options, value, onChange }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const activeLabel = options.find((option) => option.value === value)?.label ?? placeholder

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return
      }
      setIsOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="focus-ring flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-left text-sm text-white"
        aria-expanded={isOpen}
      >
        <span className={value ? "text-white" : "text-white/50"}>{activeLabel}</span>
        <span className="ml-4 text-white/60">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div
        className={`absolute left-0 right-0 z-20 mt-2 origin-top overflow-hidden rounded-2xl border border-white/10 bg-midnight-soft/95 shadow-2xl backdrop-blur transition-all duration-200 ease-out ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        {options.map((option) => {
          const isSelected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition ${
                isSelected ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
              }`}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15">
                {isSelected && <span className="h-2 w-2 rounded-full bg-neon-cyan" />}
              </span>
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const Publicar = () => {
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false)
  const [visibility, setVisibility] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [contentType, setContentType] = useState<string | null>(null)
  const [collection, setCollection] = useState<string | null>(null)
  const [collectionPrivacy, setCollectionPrivacy] = useState<string | null>(null)
  const availableTags = [
    "Bandeja",
    "Remate",
    "Defensa",
    "Golden Point",
    "WPT",
    "Premier Padel",
  ]

  return (
    <main className="pb-16 pt-16">
      <PageShell className="space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="solid" className="bg-neon-cyan text-midnight">
                Publicacion
              </Badge>
              <Badge>Panel de subida</Badge>
            </div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Publicar videos en la plataforma
            </h1>
            <p className="max-w-2xl text-base text-white/70">
              Sube un video o clip con toda la informacion necesaria para que la comunidad lo
              encuentre rapido.
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Archivo</h2>
              <p className="mt-2 text-sm text-white/60">
                Sube el video o el clip. Formatos recomendados: MP4, MOV, 4K o 1080p.
              </p>
              <div className="mt-6 rounded-3xl border border-dashed border-white/20 bg-black/30 p-8">
                <div className="flex flex-col gap-4 text-center">
                  <p className="text-sm text-white/70">Arrastra el archivo aqui o</p>
                  <Button variant="secondary">Seleccionar archivo</Button>
                  <p className="text-xs text-white/50">Maximo 8 GB · Sincroniza audio y video</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Detalles principales</h2>
              <div className="mt-5 grid gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Titulo</label>
                  <Input placeholder="Semifinal A1 - Tapia/Coello vs Galan/Chingotto" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Descripcion
                  </label>
                  <textarea
                    className="focus-ring min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40"
                    placeholder="Contexto del partido, claves tacticas, momentos destacados..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">Tipo</label>
                    <CustomSelect
                      placeholder="Selecciona tipo"
                      value={contentType}
                      onChange={setContentType}
                      options={[
                        { label: "Video", value: "video" },
                        { label: "Clip", value: "clip" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Etiquetas y colecciones</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
                      )
                    }
                    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                      isSelected
                        ? "border-neon-cyan bg-white/10 text-white"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-neon-cyan hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                  )
                })}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                      Coleccion
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan hover:text-white"
                      onClick={() => setIsCollectionModalOpen(true)}
                    >
                      Crear nueva
                    </button>
                  </div>
                  <CustomSelect
                    placeholder="Selecciona una coleccion"
                    value={collection}
                    onChange={setCollection}
                    options={[
                      { label: "Plan de juego", value: "plan-juego" },
                      { label: "Finales memorables", value: "finales-memorables" },
                      { label: "Clips de estudio", value: "clips-estudio" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Jugadores
                  </label>
                  <Input placeholder="Tapia, Coello, Galan, Chingotto" />
                </div>
              </div>
            </div>

          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Vista previa</h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.2em] text-white/40">
                  Previsualizacion
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-white">Semifinal A1 - Tapia/Coello</p>
                <p className="text-xs text-white/60">3 puntos clave · 1h 48m</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold text-white">Visibilidad</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { title: "Publico", description: "Se muestra en la plataforma" },
                  { title: "Privado", description: "Solo accesible con la URL compartida" },
                  { title: "Oculto", description: "Solo visible para ti" },
                ].map((option) => (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() =>
                      setVisibility((prev) => (prev === option.title ? null : option.title))
                    }
                    className={`rounded-2xl border bg-black/40 p-3 text-left ${
                      visibility === option.title
                        ? "border-neon-cyan text-white shadow-glow"
                        : "border-white/10 hover:border-neon-cyan"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{option.title}</p>
                    <p className="mt-1 text-xs text-white/60">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Publicaciones recientes</h2>
              <div className="mt-4 space-y-3">
                {[
                  "Final Premier Padel · R4",
                  "Tiebreak para estudiar",
                  "Analisis bandeja cruzada",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary">Guardar borrador</Button>
              <Button>Publicar ahora</Button>
              <Button variant="ghost">Programar</Button>
            </div>
          </aside>
        </section>
      </PageShell>

      {isCollectionModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur"
            aria-label="Cerrar modal"
            onClick={() => setIsCollectionModalOpen(false)}
          />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-midnight-soft p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Nueva coleccion
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Crear coleccion</h2>
                <p className="mt-2 text-sm text-white/70">
                  Guarda esta nueva coleccion para organizar futuros clips y videos.
                </p>
              </div>
              <button
                type="button"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:text-white"
                aria-label="Cerrar"
                onClick={() => setIsCollectionModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Nombre</label>
                <Input placeholder="Ej. Finales memorables" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Descripcion
                </label>
                <textarea
                  className="focus-ring min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/40"
                  placeholder="Describe el objetivo de la coleccion..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Privacidad
                  </label>
                  <CustomSelect
                    placeholder="Selecciona privacidad"
                    value={collectionPrivacy}
                    onChange={setCollectionPrivacy}
                    options={[
                      { label: "Publica", value: "publica" },
                      { label: "Solo miembros", value: "solo-miembros" },
                      { label: "Privada", value: "privada" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Imagen
                  </label>
                  <button
                    type="button"
                    className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-semibold text-white/70 transition hover:text-white"
                  >
                    Subir portada
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCollectionModalOpen(false)}>
                Cancelar
              </Button>
              <Button>Crear coleccion</Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Publicar
