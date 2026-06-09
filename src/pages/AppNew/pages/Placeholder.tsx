import { Construction } from "lucide-react"

/**
 * Placeholder temporal para secciones de /appnew aún sin mockup.
 * Se reemplaza por la página real cuando llega su diseño.
 */
const Placeholder = ({ title }: { title: string }) => (
  <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
      <Construction className="h-7 w-7" />
    </div>
    <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
    <p className="max-w-sm text-sm text-white/60">
      Pendiente de mockup. Pásame el diseño de esta sección y la construyo aquí.
    </p>
  </main>
)

export default Placeholder
