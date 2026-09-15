import { useI18n } from "../../../lib/i18n/store"
import type { ConceptOption } from "../../../lib/api/admin"

/**
 * Panel de traducción de conceptos (§ traducción de contenido al publicar/editar). Cruza los
 * conceptos actualmente seleccionados en el formulario contra el catálogo (GET /api/admin/concepts)
 * y solo muestra un input para los que todavía no tienen NameEn — tanto si son recién creados
 * como si son antiguos y nunca se tradujeron. Se usa igual en Publicar.tsx y Editar.tsx.
 */
const ConceptTranslationPanel = ({
  selectedConcepts,
  catalog,
  translations,
  onChange,
}: {
  selectedConcepts: string[]
  catalog: ConceptOption[]
  translations: Record<string, string>
  onChange: (next: Record<string, string>) => void
}) => {
  const { t } = useI18n()
  const catalogByEs = new Map(catalog.map((c) => [c.nameEs.trim().toLowerCase(), c]))
  const untranslated = Array.from(new Set(selectedConcepts.map((c) => c.trim()).filter(Boolean))).filter((c) => {
    const known = catalogByEs.get(c.toLowerCase())
    return !known || !known.nameEn
  })

  if (untranslated.length === 0) return null

  return (
    <div className="space-y-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.04] p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          {t("publicar.concept-translations.title", "Traduce los conceptos nuevos")}
        </p>
        <p className="mt-0.5 text-xs text-white/50">
          {t("publicar.concept-translations.hint", "Estos conceptos todavía no tienen nombre en inglés.")}
        </p>
      </div>
      <div className="space-y-2">
        {untranslated.map((concept) => (
          <div key={concept} className="flex items-center gap-2">
            <span className="w-2/5 shrink-0 truncate text-sm text-white/80">#{concept}</span>
            <input
              value={translations[concept] ?? ""}
              onChange={(e) => onChange({ ...translations, [concept]: e.target.value })}
              placeholder={t("publicar.concept-translations.placeholder", "Nombre en inglés")}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConceptTranslationPanel
