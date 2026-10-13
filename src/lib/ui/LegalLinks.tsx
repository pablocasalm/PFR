import { useI18n } from "../i18n/store"
import { legalUrl, type LegalDoc } from "../legal"

/**
 * Enlaces a los documentos legales (Lawwwing), en el idioma de la interfaz. Se abren en una
 * pestaña nueva para no sacar a la persona de lo que estaba haciendo.
 *  - <LegalLink doc="privacy" /> : un enlace suelto, para meterlo dentro de una frase.
 *  - <LegalLinks /> : la fila con los cuatro, para pies de pantalla.
 */

const useLabels = (): Record<LegalDoc, string> => {
  const { t } = useI18n()
  return {
    legalNotice: t("legal.legal-notice", "Aviso legal"),
    privacy: t("legal.privacy", "Política de privacidad"),
    cookies: t("legal.cookies", "Política de cookies"),
    terms: t("legal.terms", "Términos y condiciones"),
  }
}

export const LegalLink = ({ doc, className = "underline underline-offset-4 transition hover:text-white" }: { doc: LegalDoc; className?: string }) => {
  const { lang } = useI18n()
  const labels = useLabels()
  return (
    <a href={legalUrl(doc, lang)} target="_blank" rel="noopener noreferrer" className={className}>
      {labels[doc]}
    </a>
  )
}

const DOCS: LegalDoc[] = ["legalNotice", "privacy", "cookies", "terms"]

const LegalLinks = ({ className = "" }: { className?: string }) => {
  const { t } = useI18n()
  return (
    <nav aria-label={t("legal.nav", "Información legal")} className={`flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/40 ${className}`}>
      {DOCS.map((doc) => (
        <LegalLink key={doc} doc={doc} className="underline-offset-4 transition hover:text-white hover:underline" />
      ))}
    </nav>
  )
}

export default LegalLinks
