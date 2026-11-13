import { Link, useSearchParams } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import type { ContentItem } from "../../../lib/api/types"
import { ASSISTANT_NAME } from "../../../lib/assistant"
import { findPafriList, pafriHref, useAssistantChat } from "../../../lib/assistantChat"
import { hueFor } from "../../../lib/format"
import { pickText } from "../../../lib/i18n/content"
import { useI18n } from "../../../lib/i18n/store"
import { Thumb } from "./ContentCard"
import Pafri from "./Pafri"

/**
 * Para seguir la lista que recomendó PAFRI sin volver al panel: si se llega a un clip desde sus
 * tarjetas (`&from=pafri`), el reproductor ofrece el siguiente de esa lista en lugar del relacionado.
 */
export const usePafriList = (item: Pick<ContentItem, "id" | "type">) => {
  const [params] = useSearchParams()
  useAssistantChat() // vuelve a mirar la lista si cambian las conversaciones guardadas
  if (params.get("from") !== "pafri") return null
  const list = findPafriList(item)
  if (!list) return null
  return { ...list, next: list.items[list.index + 1] ?? null }
}

/** Franja bajo el vídeo: «Te lo recomendó PAFRI · 1 de 3» y el siguiente de la lista. */
export const PafriStrip = ({ list }: { list: { items: ContentItem[]; index: number; next: ContentItem | null } }) => {
  const { t, lang } = useI18n()
  const position = t("watch.pafri.position", "{n} de {total}", { n: list.index + 1, total: list.items.length })
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neon-cyan/25 bg-neon-cyan/[0.04] p-2.5">
      <Pafri pose="quieto" size={32} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neon-cyan">
          {t("watch.pafri.recommended", "Te lo recomendó {name}", { name: ASSISTANT_NAME })} · {position}
        </p>
        {!list.next && <p className="mt-0.5 text-sm text-white/70">{t("watch.pafri.last", "Es el último de su lista.")}</p>}
      </div>
      {list.next && (
        <Link to={pafriHref(list.next)} className="flex min-w-0 max-w-[55%] items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5">
          <div className="w-16 shrink-0 overflow-hidden rounded-md">
            <Thumb src={list.next.thumbnailUrl} hue={hueFor(list.next.id)} className="aspect-video w-full" />
          </div>
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wide text-white/50">{t("watch.pafri.next", "Siguiente")}</span>
            <span className="line-clamp-2 text-[13px] font-medium leading-snug text-white">{pickText(list.next.title, list.next.titleEn, lang)}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />
        </Link>
      )}
    </div>
  )
}
