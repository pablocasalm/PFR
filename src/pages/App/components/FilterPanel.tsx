/**
 * Panel de filtros compartido entre Explorar y Search/Resultados — mismo componente visual
 * (secciones de chips) y mismos campos (Tipo, Bloque, Concepto) en las dos pantallas. Cada
 * pantalla decide su propia lógica de selección (única o múltiple) y qué hacer al elegir un
 * valor (filtrar en el sitio en Explorar, navegar en Search); el componente solo pinta.
 */
export type FilterOption = { value: string; label: string }

export type FilterSection = {
  title: string
  options: FilterOption[]
  isActive: (value: string) => boolean
  onToggle: (value: string) => void
}

const FilterPanel = ({
  sections,
  onClear,
  showClear,
}: {
  sections: FilterSection[]
  onClear: () => void
  showClear: boolean
}) => (
  <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
    {sections.map((section) => (
      <div key={section.title} className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{section.title}</span>
        <div className="flex flex-wrap gap-2">
          {section.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => section.onToggle(opt.value)}
              aria-pressed={section.isActive(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                section.isActive(opt.value)
                  ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan"
                  : "border-white/15 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    ))}

    {showClear && (
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-white/60 underline-offset-2 transition hover:text-white hover:underline"
      >
        Limpiar filtros
      </button>
    )}
  </div>
)

export default FilterPanel
