import { useI18n } from "../../../lib/i18n/store"
import type { PriorityResult } from "../../../lib/api/types"

/** Etiquetas de la escala: distintas para el alumno ("Lo hice") y para la revisión de Guille. */
export const useResultLabels = () => {
  const { t } = useI18n()
  return {
    student: {
      done: t("coach.log.done", "Lo hice"),
      partial: t("coach.log.partial", "A medias"),
      missed: t("coach.log.missed", "No me salió"),
    } as Record<PriorityResult, string>,
    review: {
      done: t("coach.review.done", "Conseguida"),
      partial: t("coach.review.partial", "Parcial"),
      missed: t("coach.review.missed", "Pendiente"),
    } as Record<PriorityResult, string>,
  }
}
