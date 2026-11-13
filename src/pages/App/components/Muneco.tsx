import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import { trackActivity } from "../../../lib/api/activity"
import { getAssistantNotice, recordAssistantNotice, type AssistantNotice } from "../../../lib/api/assistant"
import { ASSISTANT_NAME, MUNECO_SIZE, hasGreeted, isAssistantHiddenOn, markGreeted } from "../../../lib/assistant"
import { useAssistantChat } from "../../../lib/assistantChat"
import { useRatingOpen } from "../../../lib/ratingOpen"
import { hasActiveSubscription, hasFeature, useAuth } from "../../../lib/auth/store"
import { formatDuration, hueFor, watchHref } from "../../../lib/format"
import { pickText } from "../../../lib/i18n/content"
import { useI18n, type TFunc } from "../../../lib/i18n/store"
import { BottomSheet } from "../../../lib/ui/BottomSheet"
import { Thumb } from "./ContentCard"
import ProgressLine from "./ProgressLine"
import MunecoPanel from "./MunecoPanel"
import Pafri, { type PafriPose } from "./Pafri"

/**
 * Muñeco (PAFRI, asistente, tarjeta #147): botón abajo a la derecha, globo con un aviso (como mucho
 * uno por visita, ver AssistantNotices en el backend) y panel con preguntas típicas. Sin IA todavía.
 * Solo se monta con VITE_ASSISTANT_ENABLED (ver AppLayout).
 *
 * Posición: en móvil y tableta, encima de la barra inferior (MobileNav); en escritorio (xl), encima
 * del botón de Feedback. Los `bottom-[…]` de abajo suman MUNECO_SIZE + 12px de separación (92px)
 * para colocar el globo y el panel encima del botón: si cambia el tamaño, cambiarlos también.
 */

/** Textos provisionales de los avisos (hasta tener los de Andrea). Con `{count}` = 1, la clave ".one". */
const noticeText = (t: TFunc, lang: string, notice: AssistantNotice) => {
  const p = notice.params ?? {}
  const params = { count: p.count ?? "", concept: pickText(p.concept ?? "", p.conceptEn, lang), title: pickText(p.title ?? "", p.titleEn, lang) }
  const one = p.count === "1"
  switch (notice.kind) {
    case "resume_analysis":
      return t("assistant.notice.resume_analysis", "¿Seguimos donde lo dejaste?")
    case "new_session":
      return t("assistant.notice.new_session", "Ya está la masterclass nueva: «{title}». ¿La vemos?", params)
    case "monthly_pick":
      return t("assistant.notice.monthly_pick", "Ya tienes el plan de este mes. ¿Le echamos un vistazo?")
    case "welcome_back":
      if (p.concept)
        return one
          ? t("assistant.notice.welcome_back_concept.one", "Desde tu última visita hay 1 clip nuevo de {concept}, lo que más ves.", params)
          : t("assistant.notice.welcome_back_concept", "Desde tu última visita hay {count} clips nuevos de {concept}, lo que más ves.", params)
      return one
        ? t("assistant.notice.welcome_back.one", "Desde tu última visita hay 1 clip nuevo.")
        : t("assistant.notice.welcome_back", "Desde tu última visita hay {count} clips nuevos.", params)
    case "saved_unwatched":
      return t("assistant.notice.saved_unwatched", "Tienes {count} vídeos en Mi Lista sin ver. ¿Empezamos por uno?", params)
    case "generic_new":
      return one
        ? t("assistant.notice.generic_new.one", "Esta semana hay 1 vídeo nuevo en PFR.")
        : t("assistant.notice.generic_new", "Esta semana hay {count} vídeos nuevos en PFR.", params)
  }
}

const noticeCta = (t: TFunc, notice: AssistantNotice) => {
  switch (notice.kind) {
    case "new_session":
      return t("assistant.notice.cta.new_session", "Ver la masterclass")
    case "monthly_pick":
      return t("assistant.notice.cta.monthly_pick", "Ver el plan")
    case "welcome_back":
      return t("assistant.notice.cta.welcome_back", "Ver los clips")
    case "saved_unwatched":
      return t("assistant.notice.cta.saved_unwatched", "Ir a Mi Lista")
    case "generic_new":
      return t("assistant.notice.cta.generic_new", "Ver novedades")
    default:
      return null
  }
}

const Muneco = () => {
  const { user } = useAuth()
  const { t, lang } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<AssistantNotice | null>(null)
  const recordedShown = useRef<string | null>(null)

  const ratingOpen = useRatingOpen()
  const chat = useAssistantChat()
  const [greeted, setGreeted] = useState(hasGreeted)

  const ready = !!user && hasActiveSubscription(user) && !!user.hasSeenOnboarding
  // Mientras se pide la valoración, fuera: le tapa la esquina, y el aviso no contaría como visto.
  const visible = ready && !isAssistantHiddenOn(location.pathname) && !ratingOpen
  const isClub = hasFeature(user, "monthlyPicks")

  // Un aviso por visita: se pide una sola vez al abrir la app (el muñeco se monta con el layout).
  const requested = useRef(false)
  useEffect(() => {
    if (!ready || requested.current) return
    requested.current = true
    getAssistantNotice()
      .then(setNotice)
      .catch(() => {})
  }, [ready])

  // Cuenta como visto cuando de verdad sale en pantalla (no al pedirlo: puede haber entrado
  // directo al reproductor, donde el muñeco está escondido).
  const showBubble = visible && !open && !!notice
  useEffect(() => {
    if (!showBubble || !notice || recordedShown.current === notice.key) return
    recordedShown.current = notice.key
    recordAssistantNotice(notice, "shown")
  }, [showBubble, notice])

  if (!visible) return null

  const dismiss = () => {
    if (notice) recordAssistantNotice(notice, "dismiss")
    setNotice(null)
  }
  const follow = () => {
    if (!notice) return
    recordAssistantNotice(notice, "click")
    const href = notice.item ? watchHref(notice.item) : notice.href
    setNotice(null)
    if (href) navigate(href)
  }

  // Postura: piensa mientras la IA responde; con el panel abierto, habla (o saluda en el adelanto de
  // Essential); cerrado, avisa si tiene algo, saluda hasta la primera vez que se abre, y si no, quieto.
  const pose: PafriPose = open
    ? chat.sending ? "pensando" : isClub ? "hablando" : "saludando"
    : chat.sending ? "pensando" : notice ? "aviso" : !greeted ? "saludando" : "quieto"

  const toggle = () => {
    if (!open) trackActivity("assistant_open")
    if (!greeted) {
      markGreeted()
      setGreeted(true)
    }
    setOpen(!open)
  }

  const cta = notice ? noticeCta(t, notice) : null
  const panel = <MunecoPanel isClub={isClub} onNavigate={() => setOpen(false)} />

  return (
    <>
      {showBubble && notice && (
        <div
          role="status"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+92px)] right-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-neon-cyan/30 bg-midnight-soft/95 p-3 text-sm text-white shadow-xl backdrop-blur xl:bottom-[calc(5.5rem+92px)] xl:right-6"
        >
          <button
            onClick={dismiss}
            aria-label={t("assistant.notice.close", "Cerrar aviso")}
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="pr-8 leading-snug">{noticeText(t, lang, notice)}</p>
          {notice.item && (
            <button onClick={follow} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-white/10 p-2 text-left">
              <div className="relative w-24 shrink-0 overflow-hidden rounded-lg">
                <Thumb src={notice.item.thumbnailUrl} hue={hueFor(notice.item.id)} className="aspect-video w-full" />
                <ProgressLine progress={notice.item.progress} completed={notice.item.completed} />
              </div>
              <span className="min-w-0">
                <span className="line-clamp-2 text-[13px] font-medium leading-snug">{pickText(notice.item.title, notice.item.titleEn, lang)}</span>
                <span className="mt-0.5 block text-[11px] text-white/50">{formatDuration(notice.item.durationSeconds)}</span>
              </span>
            </button>
          )}
          {!notice.item && cta && (
            <button onClick={follow} className="mt-3 rounded-full bg-neon-cyan px-4 py-2 text-[13px] font-semibold text-midnight">
              {cta}
            </button>
          )}
        </div>
      )}

      {/* La primera vez, PAFRI se presenta al lado del botón (como en la landing), hasta que se abre. */}
      {!greeted && !open && !showBubble && (
        <button
          onClick={toggle}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+24px)] right-[104px] z-40 whitespace-nowrap rounded-full border border-white/10 bg-midnight-soft/95 px-3 py-1.5 text-[13px] text-white shadow-lg backdrop-blur xl:bottom-[calc(5.5rem+24px)] xl:right-[112px]"
        >
          {t("assistant.greeting", "¡Hola! Soy {name}", { name: ASSISTANT_NAME })}
        </button>
      )}

      {/* Círculo con halo detrás para que se lea como botón (en el móvil no hay hover que lo delate). */}
      <button
        onClick={toggle}
        aria-label={t("assistant.open", "Hablar con {name}", { name: ASSISTANT_NAME })}
        aria-expanded={open}
        style={{ width: MUNECO_SIZE, height: MUNECO_SIZE }}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center justify-center rounded-full border border-neon-cyan/40 bg-midnight-soft shadow-[0_0_18px_rgba(40,240,224,0.25),0_6px_16px_rgba(0,0,0,0.5)] transition-transform active:scale-95 xl:bottom-[5.5rem] xl:right-6"
      >
        <Pafri pose={pose} size={MUNECO_SIZE - 12} />
      </button>

      {/* Panel: hoja inferior en móvil y tableta; tarjeta flotante encima del botón en escritorio. */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={ASSISTANT_NAME}>
        {panel}
      </BottomSheet>
      {open && (
        <div
          role="dialog"
          aria-label={ASSISTANT_NAME}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+92px)] right-4 z-40 hidden max-h-[70dvh] w-96 flex-col overflow-hidden rounded-2xl border border-white/10 bg-midnight-soft shadow-2xl lg:flex xl:bottom-[calc(5.5rem+92px)] xl:right-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="flex items-center gap-2 font-display text-base font-semibold">
              <Pafri pose="minimal" size={28} />
              {ASSISTANT_NAME}
            </p>
            <button onClick={() => setOpen(false)} aria-label={t("assistant.close", "Cerrar")} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">{panel}</div>
        </div>
      )}
    </>
  )
}

export default Muneco

