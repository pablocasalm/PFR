import { useState, type ReactNode } from "react"

/**
 * Barras horizontales sencillas para el panel (sin librería de gráficas): cada fila con su
 * etiqueta, el número y el % sobre `total`. Si no se pasa `total`, el % es sobre la suma. Con
 * `percent={false}` no se muestra el % (rankings, donde la barra es relativa al primero).
 */
export const Bars = ({
  rows,
  total,
  tone = "bg-neon-cyan/70",
  empty,
  percent = true,
}: {
  rows: { label: string; value: number; hint?: string }[]
  total?: number
  tone?: string
  empty?: string
  percent?: boolean
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
              {percent && <span className="ml-2 text-xs text-white/40">{pct(r.value)}%</span>}
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

/**
 * Columnas por día (actividad, altas). Sin hover en el móvil: al tocar una columna se ve su día y
 * su valor; por defecto, el último día. Debajo, el primer y el último día del rango.
 */
export const Columns = ({
  points,
  format,
  dayLabel,
  tone = "bg-neon-cyan/70",
}: {
  points: { day: string; value: number }[]
  /** Texto del valor ("12 personas"). */
  format: (value: number) => string
  /** "21 oct" a partir de "2026-10-21". */
  dayLabel: (day: string) => string
  tone?: string
}) => {
  const [selected, setSelected] = useState<number | null>(null)
  if (points.length === 0) return <p className="text-sm text-white/40">—</p>
  const max = Math.max(1, ...points.map((p) => p.value))
  const index = selected ?? points.length - 1
  const current = points[index]
  return (
    <div>
      <p className="mb-2 text-sm text-white/80">
        <span className="text-white/50">{dayLabel(current.day)} · </span>
        <span className="font-semibold text-white">{format(current.value)}</span>
      </p>
      <div className="flex h-32 items-end gap-px">
        {points.map((p, i) => (
          <button
            key={p.day}
            type="button"
            onClick={() => setSelected(i)}
            aria-label={`${dayLabel(p.day)}: ${format(p.value)}`}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-sm ${i === index ? "bg-neon-lime" : tone}`}
              style={{ height: `${p.value > 0 ? Math.max((100 * p.value) / max, 3) : 1}%`, opacity: p.value > 0 ? 1 : 0.25 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-white/40">
        <span>{dayLabel(points[0].day)}</span>
        <span>{dayLabel(points[points.length - 1].day)}</span>
      </div>
    </div>
  )
}
