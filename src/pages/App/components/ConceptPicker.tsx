import { Check } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"
import { useTaxonomy } from "../../../lib/taxonomy"

/**
 * Conceptos de UN bloque, para Publicar y Editar. Catálogo cerrado (decidido el 21/10/2026): solo
 * se puede elegir entre los conceptos que ya tiene el bloque, en su orden y con su número de la
 * Base de conocimiento ("3.2 Mantener"); no se pueden crear conceptos nuevos desde aquí. Varios a
 * la vez, con un toque cada uno (cómodo en el móvil).
 */
const ConceptPicker = ({ block, selected, onChange }: { block: string; selected: string[]; onChange: (values: string[]) => void }) => {
  const { t } = useI18n()
  const tax = useTaxonomy()
  const b = tax.byBlock.get(block)
  const concepts = b?.concepts ?? []

  // Conceptos ya marcados que no son de este bloque (p. ej. al cambiar el bloque del grupo o
  // contenido antiguo): se enseñan para poder quitarlos, pero no se pueden añadir.
  const foreign = selected.filter((s) => !concepts.some((c) => c.nameEs === s))

  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name])

  if (!b) return <p className="text-xs text-white/40">{t("concept-picker.loading", "Cargando conceptos…")}</p>

  return (
    <div className="flex flex-wrap gap-1.5">
      {concepts.map((c) => {
        const on = selected.includes(c.nameEs)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.nameEs)}
            aria-pressed={on}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
              on ? "border-neon-cyan bg-neon-cyan/15 text-neon-cyan" : "border-white/12 text-white/70 hover:text-white"
            }`}
          >
            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            <span className="font-mono text-[11px] opacity-70">
              {b.number}.{c.number}
            </span>
            {c.nameEs}
          </button>
        )
      })}
      {foreign.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => toggle(name)}
          title={t("concept-picker.foreign", "No es de este bloque: pulsa para quitarlo")}
          className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-200"
        >
          {name} ×
        </button>
      ))}
    </div>
  )
}

export default ConceptPicker
