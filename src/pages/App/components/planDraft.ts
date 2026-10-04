import type { ContentItem } from "../../../lib/api/types"

/** Borrador de "El plan del mes" que comparten PlanEditor (lo pinta) y AdminSesiones (lo publica). */

export const MIN_SITUATIONS = 2
export const MAX_SITUATIONS = 4

export type SituationDraft = {
  key: number // solo para React; el id real lo pone el backend
  title: string
  titleEn: string
  shortTitle: string
  shortTitleEn: string
  recognize: string
  recognizeEn: string
  clips: ContentItem[]
}

let draftKey = 0
export const emptySituation = (): SituationDraft => ({
  key: ++draftKey,
  title: "",
  titleEn: "",
  shortTitle: "",
  shortTitleEn: "",
  recognize: "",
  recognizeEn: "",
  clips: [],
})

export const isSituationComplete = (s: SituationDraft) => !!s.title.trim() && !!s.shortTitle.trim() && !!s.recognize.trim() && s.clips.length > 0

export const isSituationEmpty = (s: SituationDraft) =>
  !s.title.trim() && !s.titleEn.trim() && !s.shortTitle.trim() && !s.shortTitleEn.trim() && !s.recognize.trim() && !s.recognizeEn.trim() && s.clips.length === 0
