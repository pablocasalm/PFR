import { useState } from "react"
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react"
import { hueFor } from "../../../lib/format"
import { useI18n } from "../../../lib/i18n/store"
import { Thumb } from "./ContentCard"
import ClipCatalog from "./ClipCatalog"
import { emptySituation, isSituationComplete, MIN_SITUATIONS, MAX_SITUATIONS, type SituationDraft } from "./planDraft"

/**
 * Espacio de trabajo de "El plan del mes" (admin, panel ancho de AdminSesiones). Una situación
 * activa cada vez, elegida en las pestañas de arriba:
 *  - columna izquierda: sus textos y la lista de clips ya elegidos (quitar / reordenar);
 *  - columna derecha: el catálogo completo de clips (ClipCatalog), donde un clic añade o quita
 *    el clip de la situación activa.
 * Así no hay un formulario largo con todas las situaciones apiladas. El estado vive en quien lo
 * usa, para que el plan se publique junto con la masterclass.
 */

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"

const labelCls = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-white/50"

const PlanEditor = ({
  note,
  noteEn,
  onNote,
  onNoteEn,
  situations,
  onChange,
}: {
  note: string
  noteEn: string
  onNote: (value: string) => void
  onNoteEn: (value: string) => void
  situations: SituationDraft[]
  onChange: (situations: SituationDraft[]) => void
}) => {
  const { t } = useI18n()
  const [activeKey, setActiveKey] = useState(situations[0].key)
  const activeIndex = Math.max(0, situations.findIndex((s) => s.key === activeKey))
  const active = situations[activeIndex]

  const update = (changes: Partial<SituationDraft>) => onChange(situations.map((s) => (s.key === active.key ? { ...s, ...changes } : s)))

  const toggleClip = (clip: SituationDraft["clips"][number]) =>
    update({ clips: active.clips.some((c) => c.id === clip.id) ? active.clips.filter((c) => c.id !== clip.id) : [...active.clips, clip] })

  const moveClip = (from: number, to: number) => {
    const clips = [...active.clips]
    const [clip] = clips.splice(from, 1)
    clips.splice(to, 0, clip)
    update({ clips })
  }

  const addSituation = () => {
    const next = emptySituation()
    onChange([...situations, next])
    setActiveKey(next.key)
  }

  const removeActive = () => {
    const rest = situations.filter((s) => s.key !== active.key)
    onChange(rest)
    setActiveKey(rest[Math.max(0, activeIndex - 1)].key)
  }

  const usedElsewhere = new Map<string, number>()
  situations.forEach((s, i) => {
    if (s.key !== active.key) s.clips.forEach((c) => usedElsewhere.set(c.id, i + 1))
  })

  return (
    <div className="space-y-6">
      {/* Introducción del plan */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label className={labelCls}>{t("admin-sesiones.plan-note-label", "Introducción del plan")}</label>
          <textarea value={note} onChange={(e) => onNote(e.target.value)} maxLength={2000} rows={2} placeholder={t("admin-sesiones.plan-note", "Este mes trabajamos 3 situaciones que salieron en vuestras preguntas...")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("admin-sesiones.plan-note-en-label", "Introducción en inglés (opcional)")}</label>
          <textarea value={noteEn} onChange={(e) => onNoteEn(e.target.value)} maxLength={2000} rows={2} className={inputCls} />
        </div>
      </div>

      {/* Pestañas de situaciones */}
      <div className="flex flex-wrap items-stretch gap-2" role="tablist">
        {situations.map((s, i) => {
          const selected = s.key === active.key
          const complete = isSituationComplete(s)
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveKey(s.key)}
              className={`flex min-w-[150px] flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition sm:flex-none ${
                selected ? "border-neon-cyan/60 bg-neon-cyan/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  complete ? "bg-neon-cyan text-midnight" : "border border-white/30 text-white/70"
                }`}
              >
                {complete ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-semibold ${selected ? "text-white" : "text-white/75"}`}>
                  {s.shortTitle.trim() || s.title.trim() || t("admin-recomendado.situation", "Situación {n}", { n: i + 1 })}
                </span>
                <span className="block text-xs text-white/45">{t("admin-sesiones.clips-count", "{count} clips", { count: s.clips.length })}</span>
              </span>
            </button>
          )
        })}
        {situations.length < MAX_SITUATIONS && (
          <button
            onClick={addSituation}
            className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm font-medium text-white/60 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
          >
            <Plus className="h-4 w-4" /> {t("admin-recomendado.add-situation", "Añadir situación")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Situación activa: textos + clips elegidos */}
        <div className="min-w-0 space-y-4 self-start rounded-2xl border border-white/10 bg-white/[0.02] p-4 lg:sticky lg:top-0">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">{t("admin-recomendado.situation", "Situación {n}", { n: activeIndex + 1 })}</h3>
            {situations.length > MIN_SITUATIONS && (
              <button onClick={removeActive} className="flex items-center gap-1.5 text-xs font-medium text-white/40 transition hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" /> {t("admin-recomendado.remove-situation", "Quitar situación")}
              </button>
            )}
          </div>

          <div>
            <label className={labelCls}>{t("admin-sesiones.situation.title-label", "Título")}</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} maxLength={200} placeholder={t("admin-recomendado.situation.title-short", "Cuando los globos te sacan de la red")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("admin-sesiones.situation.short-label", "Etiqueta corta (pestaña de Inicio)")}</label>
            <input value={active.shortTitle} onChange={(e) => update({ shortTitle: e.target.value })} maxLength={60} placeholder={t("admin-recomendado.situation.short-short", "La red y los globos")} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{t("admin-recomendado.situation.recognize", "Qué reconocer")}</label>
            <textarea value={active.recognize} onChange={(e) => update({ recognize: e.target.value })} maxLength={1000} rows={3} className={inputCls} />
          </div>

          <details className="rounded-xl border border-white/10 px-3 py-2.5">
            <summary className="cursor-pointer text-xs font-medium text-white/60">{t("admin-sesiones.situation.english", "Versión en inglés (opcional)")}</summary>
            <div className="mt-3 space-y-3">
              <input value={active.titleEn} onChange={(e) => update({ titleEn: e.target.value })} maxLength={200} placeholder={t("admin-sesiones.situation.title-label", "Título")} className={inputCls} />
              <input value={active.shortTitleEn} onChange={(e) => update({ shortTitleEn: e.target.value })} maxLength={60} placeholder={t("admin-sesiones.situation.short-only", "Etiqueta corta")} className={inputCls} />
              <textarea value={active.recognizeEn} onChange={(e) => update({ recognizeEn: e.target.value })} maxLength={1000} rows={3} placeholder={t("admin-recomendado.situation.recognize", "Qué reconocer")} className={inputCls} />
            </div>
          </details>

          <div>
            <label className={labelCls}>{t("admin-sesiones.situation.clips-label", "Clips de esta situación ({count})", { count: active.clips.length })}</label>
            {active.clips.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-center text-xs leading-relaxed text-white/45">
                {t("admin-sesiones.situation.clips-empty", "Pulsa los clips del catálogo para añadirlos aquí.")}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {active.clips.map((clip, i) => (
                  <li key={clip.id} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                    <span className="w-4 shrink-0 text-center text-xs font-bold tabular-nums text-neon-cyan">{i + 1}</span>
                    <Thumb src={clip.thumbnailUrl} hue={hueFor(clip.id)} className="aspect-video w-16 shrink-0 rounded" />
                    <span className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug text-white/85">{clip.title}</span>
                    <span className="flex shrink-0 items-center">
                      <button onClick={() => moveClip(i, i - 1)} disabled={i === 0} className="p-1 text-white/45 transition hover:text-neon-cyan disabled:opacity-25" aria-label={t("admin-recomendado.move-before", "Mover antes")}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveClip(i, i + 1)} disabled={i === active.clips.length - 1} className="p-1 text-white/45 transition hover:text-neon-cyan disabled:opacity-25" aria-label={t("admin-recomendado.move-after", "Mover después")}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleClip(clip)} className="p-1 text-white/45 transition hover:text-red-400" aria-label={t("admin-recomendado.remove-aria", "Quitar")}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Catálogo: un clic añade o quita de la situación activa */}
        <ClipCatalog selected={active.clips} usedElsewhere={usedElsewhere} onToggle={toggleClip} />
      </div>
    </div>
  )
}

export default PlanEditor
