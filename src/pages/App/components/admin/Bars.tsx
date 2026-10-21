import type { ReactNode } from "react"

/**
 * Barras horizontales sencillas para el panel (sin librería de gráficas): cada fila con su
 * etiqueta, el número y el % sobre `total`. Si no se pasa `total`, el % es sobre la suma.
 */
export const Bars = ({
  rows,
  total,
  tone = "bg-neon-cyan/70",
  empty,
}: {
  rows: { label: string; value: number; hint?: string }[]
  total?: number
  tone?: string
  empty?: string
}) => {
  const base = total ?? rows.reduce((sum, r) => sum + r.value, 0)
  const pct = (v: number) => (base > 0 ? Math.round((100 * v) / base) : 0)
  if (rows.length === 0 || base === 0) return <p className="text-sm text-white/40">{empty ?? "—"}</p>
  return (
    <ol className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words text-white/80">{r.label}</span>
            <span className="shrink-0 text-white">
              <span className="font-semibold">{r.value}</span>
              <span className="ml-2 text-xs text-white/40">{pct(r.value)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${tone}`}
              style={{
                width: `${Math.max(pct(r.value), r.value > 0 ? 2 : 0)}%`,
              }}
            />
          </div>
          {r.hint && <p className="mt-1 text-xs text-white/40">{r.hint}</p>}
        </li>
      ))}
    </ol>
  )
}

/** Tarjeta con título para agrupar una gráfica. */
export const ChartCard = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="min-w-0 rounded-xl border border-white/10 bg-white/[0.02] p-4">
    <h3 className="text-sm font-bold uppercase tracking-wide text-white/60">{title}</h3>
    {hint && <p className="mt-0.5 text-xs text-white/40">{hint}</p>}
    <div className="mt-4">{children}</div>
  </section>
)
