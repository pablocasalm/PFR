import { Target, Film, Eye, Zap, CheckCircle2, RotateCcw, ArrowRight, ArrowDown, Repeat } from "lucide-react"
import type { LucideIcon } from "lucide-react"

/**
 * ComoFunciona — Explicador visual del método de PFR (/app/como-funciona).
 * No es una FAQ: transmite la filosofía (aprender a reconocer patrones, no consumir vídeos)
 * casi sin texto, con diagramas hechos a mano (SVG). 100% estático/ilustrativo.
 */

// Colores de marca para las conexiones.
const C = { cyan: "#28f0e0", lime: "#befc4b", sky: "#38bdf8" }

// ---------------------------------------------------------------------------
// Envoltorio de sección
// ---------------------------------------------------------------------------

const Section = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children: React.ReactNode
}) => (
  <section className="border-t border-white/5 py-16 sm:py-20">
    {eyebrow && (
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-neon-cyan">{eyebrow}</p>
    )}
    <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
    <div className="mt-8">{children}</div>
  </section>
)

// ---------------------------------------------------------------------------
// Sección 2 — Una situación real enseña varias cosas
// ---------------------------------------------------------------------------

const BRANCHES = [
  { color: C.cyan, block: "Juego en la red", concept: "Presión" },
  { color: C.sky, block: "Lectura del rival", concept: "Insistencia" },
  { color: C.lime, block: "Gestión del ritmo", concept: "Cambio de ritmo" },
]

const SituacionReal = () => (
  <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    {/* Imagen del clip con puntos de conexión */}
    <div className="relative overflow-hidden rounded-2xl border border-white/10">
      <div className="aspect-video w-full bg-gradient-to-br from-[#0a1a2b] to-[#04060a]">
        <img
          src="/metodo/situacion.png"
          alt="Situación real de partido"
          className="h-full w-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      </div>
      <span className="absolute left-3 top-3 rounded-md bg-neon-cyan px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-midnight">
        Clip
      </span>
      {/* Puntos de salida (uno por rama), a la derecha */}
      <div className="absolute inset-y-0 right-0 hidden flex-col justify-around py-8 pr-1 lg:flex">
        {BRANCHES.map((b) => (
          <span key={b.block} className="h-3 w-3 rounded-full ring-4 ring-black/40" style={{ background: b.color }} />
        ))}
      </div>
    </div>

    {/* Ramas: bloque → concepto, color por rama */}
    <div className="space-y-4">
      {BRANCHES.map((b) => (
        <div key={b.block} className="flex items-center gap-3">
          <span className="hidden h-px w-8 shrink-0 lg:block" style={{ background: b.color }} />
          <div className="flex flex-1 items-center gap-2">
            <span
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-white"
              style={{ borderColor: `${b.color}66`, background: `${b.color}14` }}
            >
              {b.block}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" style={{ color: b.color }} />
            <span className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ color: b.color, background: `${b.color}14` }}>
              #{b.concept}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// Sección 3 — Red de conocimiento (grafo)
// ---------------------------------------------------------------------------

const KnowledgeGraph = () => {
  const clips = [
    { x: 120, y: 95, label: "Clip 1" },
    { x: 120, y: 200, label: "Clip 2" },
    { x: 120, y: 305, label: "Clip 3" },
  ]
  const concepts = [
    { x: 600, y: 70, label: "#Presión" },
    { x: 620, y: 150, label: "#Subir" },
    { x: 620, y: 250, label: "#Globo" },
    { x: 600, y: 330, label: "#Paciencia" },
  ]
  // Un clip conecta con varios conceptos; conceptos compartidos entre clips.
  const edges = [
    { from: 0, to: 0, color: C.cyan },
    { from: 0, to: 1, color: C.cyan },
    { from: 1, to: 1, color: C.lime },
    { from: 1, to: 2, color: C.lime },
    { from: 2, to: 2, color: C.sky },
    { from: 2, to: 3, color: C.sky },
  ]
  return (
    <svg viewBox="0 0 740 400" className="h-auto w-full">
      {edges.map((e, i) => {
        const a = clips[e.from]
        const b = concepts[e.to]
        return (
          <path
            key={i}
            d={`M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`}
            fill="none"
            stroke={e.color}
            strokeWidth={2}
            strokeOpacity={0.55}
          />
        )
      })}
      {clips.map((c) => (
        <g key={c.label}>
          <rect x={c.x - 48} y={c.y - 20} width={96} height={40} rx={10} fill="#0c1220" stroke="#ffffff22" />
          <text x={c.x} y={c.y + 5} textAnchor="middle" fill="#fff" fontSize={15} fontWeight={600}>
            {c.label}
          </text>
        </g>
      ))}
      {concepts.map((c) => (
        <g key={c.label}>
          <rect x={c.x - 62} y={c.y - 18} width={124} height={36} rx={18} fill="#28f0e014" stroke="#28f0e055" />
          <text x={c.x} y={c.y + 5} textAnchor="middle" fill="#28f0e0" fontSize={14} fontWeight={500}>
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sección 4 — Cómo recomendamos aprender (recorrido cíclico)
// ---------------------------------------------------------------------------

const STEPS: { icon: LucideIcon; title: string; sub?: string }[] = [
  { icon: Target, title: "Elige un concepto", sub: "Ej. #Subir a la red" },
  { icon: Film, title: "Mira varias situaciones reales", sub: "Ejemplos del mismo patrón" },
  { icon: Eye, title: "Empieza a reconocer el patrón", sub: "Ves lo que se repite" },
  { icon: Zap, title: "Ve a jugar", sub: "Llévatelo a la pista" },
  { icon: CheckCircle2, title: "Identifícalo durante tus partidos", sub: "Lo reconoces en tiempo real" },
  { icon: RotateCcw, title: "Vuelve a PFR a reforzarlo", sub: "…o cambia de concepto" },
]

const Recorrido = () => (
  <div>
    <div className="space-y-0">
      {STEPS.map(({ icon: Icon, title, sub }, i) => (
        <div key={title} className="flex gap-4">
          {/* Rail: número + línea */}
          <div className="flex flex-col items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neon-cyan/40 bg-neon-cyan/10 text-sm font-bold text-neon-cyan">
              {i + 1}
            </span>
            {i < STEPS.length - 1 && <span className="w-px flex-1 bg-gradient-to-b from-neon-cyan/40 to-white/10" />}
          </div>
          {/* Tarjeta del paso */}
          <div className="mb-4 flex flex-1 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Icon className="h-5 w-5 shrink-0 text-neon-cyan" />
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              {sub && <p className="text-xs text-white/50">{sub}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Cierre del ciclo */}
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-neon-lime/30 bg-neon-lime/[0.06] p-4">
      <Repeat className="h-5 w-5 shrink-0 text-neon-lime" />
      <p className="text-sm text-white/80">
        El aprendizaje es un <span className="font-semibold text-neon-lime">ciclo</span>: vuelve al principio y sigue
        sumando patrones. Añadimos nuevos clips y conceptos continuamente.
      </p>
    </div>

    <p className="mt-8 text-center font-display text-xl font-bold text-white sm:text-2xl">
      Ver <span className="text-white/30">→</span> Reconocer <span className="text-white/30">→</span> Jugar{" "}
      <span className="text-white/30">→</span> <span className="text-neon-cyan">Repetir</span>
    </p>
  </div>
)

// ---------------------------------------------------------------------------
// Sección 5 — No se trata de ver más vídeos (comparación)
// ---------------------------------------------------------------------------

const Comparacion = () => (
  <div>
    <div className="grid gap-4 md:grid-cols-2">
      {/* Izquierda: vídeos sueltos */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <p className="mb-1 text-sm font-bold uppercase tracking-wide text-white/50">Consumir vídeos sueltos</p>
        <p className="mb-5 text-xs text-white/40">Contenido aislado, sin conexión entre sí.</p>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-lg border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </div>

      {/* Derecha: aprender patrones */}
      <div className="rounded-2xl border border-neon-cyan/25 bg-neon-cyan/[0.04] p-6">
        <p className="mb-1 text-sm font-bold uppercase tracking-wide text-neon-cyan">Aprender patrones</p>
        <p className="mb-5 text-xs text-white/40">Un concepto, varias situaciones, un mismo aprendizaje.</p>
        <div className="space-y-2.5">
          <span className="inline-block rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan">
            #Un concepto
          </span>
          <ArrowDown className="h-4 w-4 text-neon-cyan/60" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-video flex-1 rounded-lg border border-neon-cyan/20 bg-neon-cyan/[0.06]" />
            ))}
          </div>
          <ArrowDown className="h-4 w-4 text-neon-cyan/60" />
          <p className="text-sm text-white/80">Reconoces el patrón</p>
          <ArrowDown className="h-4 w-4 text-neon-cyan/60" />
          <p className="text-sm text-white/80">Lo identificas jugando</p>
          <ArrowDown className="h-4 w-4 text-neon-cyan/60" />
          <p className="text-sm font-semibold text-neon-lime">Mejoras tu toma de decisiones</p>
        </div>
      </div>
    </div>

    <p className="mx-auto mt-10 max-w-2xl text-center font-display text-xl font-bold leading-snug text-white sm:text-2xl">
      No importa cuántos vídeos veas.{" "}
      <span className="text-neon-cyan">Importa cuántas situaciones eres capaz de reconocer cuando juegas.</span>
    </p>
  </div>
)

// ---------------------------------------------------------------------------
// Sección 6 — Tu primer entrenamiento (checklist)
// ---------------------------------------------------------------------------

const CHECKLIST = [
  "Entra en Explorar",
  "Escoge un bloque",
  "Elige un concepto",
  "Mira varias situaciones relacionadas",
  "Guarda las que más te ayuden en Mi Lista",
  "Ve a jugar",
  "Vuelve para seguir aprendiendo",
]

const Checklist = () => (
  <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
    <ul className="space-y-4">
      {CHECKLIST.map((item, i) => (
        <li key={item} className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-white/25" />
          <span className="text-sm text-white/85">
            <span className="mr-2 text-xs font-bold text-white/30">{i + 1}</span>
            {item}
          </span>
        </li>
      ))}
    </ul>
  </div>
)

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const ComoFunciona = () => (
  <main className="mx-auto w-full max-w-4xl pb-10">
    {/* Sección 1 — Hero */}
    <section className="py-16 text-center sm:py-24">
      <h1 className="font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
        Cómo usar <span className="text-neon-cyan">Padel Film Room</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
        Aprende a reconocer situaciones reales de partido, entender el juego y tomar mejores decisiones cuando vuelvas a
        la pista.
      </p>
    </section>

    {/* Sección 2 */}
    <Section eyebrow="El punto de partida" title="Aprende a través de situaciones reales">
      <SituacionReal />
      <p className="mt-8 text-center text-sm text-white/50">
        Una sola situación de partido puede enseñarte varias cosas a la vez.
      </p>
    </Section>

    {/* Sección 3 */}
    <Section eyebrow="La estructura" title="Cómo organizamos el aprendizaje">
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <KnowledgeGraph />
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center font-display text-xl font-bold text-white sm:text-2xl">
        No organizamos vídeos. <span className="text-neon-cyan">Organizamos aprendizajes tácticos.</span>
      </p>
    </Section>

    {/* Sección 4 */}
    <Section eyebrow="El método" title="Cómo recomendamos aprender">
      <Recorrido />
    </Section>

    {/* Sección 5 */}
    <Section eyebrow="La diferencia" title="No se trata de ver más vídeos">
      <Comparacion />
    </Section>

    {/* Sección 6 */}
    <Section eyebrow="Empieza ahora" title="Tu primer entrenamiento">
      <Checklist />
    </Section>
  </main>
)

export default ComoFunciona
