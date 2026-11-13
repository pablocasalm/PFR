import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Check, ChevronLeft, LifeBuoy, SendHorizontal } from "lucide-react"
import { trackActivity } from "../../../lib/api/activity"
import { getAssistantUsage, type AssistantUsage } from "../../../lib/api/assistant"
import type { ContentItem } from "../../../lib/api/types"
import { currentAsSaved, openSavedChat, pafriHref, resetChat, sendChatMessage, sendChatToSupport, useAssistantChat, type SavedChat } from "../../../lib/assistantChat"
import { getHome } from "../../../lib/api/home"
import { formatDuration, hueFor, watchHref } from "../../../lib/format"
import { useApi } from "../../../lib/hooks/useApi"
import { pickText } from "../../../lib/i18n/content"
import { useI18n } from "../../../lib/i18n/store"
import { testHref } from "../../../lib/starterTest"
import { blockSearchHref, useTaxonomy } from "../../../lib/taxonomy"
import { Thumb } from "./ContentCard"
import ProgressLine from "./ProgressLine"
import Pafri from "./Pafri"
import { ASSISTANT_NAME } from "../../../lib/assistant"

/**
 * Contenido del panel del muñeco. Club y Coach: botones de preguntas típicas con respuestas fijas que
 * llevan a pantallas que ya existen (fase 0) y el chat con IA (fase 1), si está disponible.
 * Essential: un adelanto de lo que hace el asistente, con un ejemplo y el botón para pasarse a Club.
 * Todos los textos son provisionales hasta tener los de Andrea.
 */

type Question = "start" | "new" | "improve" | "continue"

const PanelLink = ({ to, onNavigate, children, primary }: { to: string; onNavigate: () => void; children: React.ReactNode; primary?: boolean }) => (
  <Link
    to={to}
    onClick={() => onNavigate()}
    className={
      primary
        ? "inline-flex rounded-full bg-neon-cyan px-4 py-2 text-[13px] font-semibold text-midnight"
        : "inline-flex rounded-full border border-white/15 px-4 py-2 text-[13px] font-medium text-white hover:bg-white/5"
    }
  >
    {children}
  </Link>
)

/** Globo de texto del muñeco (izquierda) o de la persona (derecha). */
const Bubble = ({ from, children }: { from: "muneco" | "user"; children: React.ReactNode }) => (
  <div
    className={
      from === "muneco"
        ? "max-w-[85%] rounded-2xl rounded-tl-sm bg-white/[0.07] px-3.5 py-2.5 text-sm leading-snug text-white"
        : "ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-neon-cyan/15 px-3.5 py-2.5 text-sm leading-snug text-neon-cyan"
    }
  >
    {children}
  </div>
)

/** Tarjetas compactas (miniatura + título) para el panel: novedades y clips que recomienda el chat. */
const ItemList = ({ items, onNavigate, fromChat }: { items: ContentItem[]; onNavigate: () => void; fromChat?: boolean }) => {
  const { lang } = useI18n()
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link key={`${item.type}-${item.id}`} to={fromChat ? pafriHref(item) : watchHref(item)} onClick={onNavigate} className="flex items-center gap-3 rounded-xl border border-white/10 p-2 hover:bg-white/5">
          <div className="relative w-24 shrink-0 overflow-hidden rounded-lg">
            <Thumb src={item.thumbnailUrl} hue={hueFor(item.id)} className="aspect-video w-full" />
            <ProgressLine progress={item.progress} completed={item.completed} />
          </div>
          <span className="min-w-0">
            <span className="line-clamp-2 text-[13px] font-medium leading-snug">{pickText(item.title, item.titleEn, lang)}</span>
            <span className="mt-0.5 block text-[11px] text-white/50">{formatDuration(item.durationSeconds)}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

const NewItems = ({ onNavigate }: { onNavigate: () => void }) => {
  const { data } = useApi(getHome, [], "home")
  return <ItemList items={(data?.newThisWeek ?? []).slice(0, 4)} onNavigate={onNavigate} />
}

/** Preguntas típicas (fase 0): respuestas fijas que llevan a pantallas que ya existen. */
const TypicalQuestions = ({ onNavigate }: { onNavigate: () => void }) => {
  const { t, lang } = useI18n()
  const { blocks } = useTaxonomy()
  const [question, setQuestion] = useState<Question | null>(null)

  const questions: { key: Question; label: string }[] = [
    { key: "start", label: t("assistant.q.start", "Soy nuevo, ¿por dónde empiezo?") },
    { key: "new", label: t("assistant.q.new", "¿Qué hay nuevo?") },
    { key: "improve", label: t("assistant.q.improve", "Quiero mejorar una parte de mi juego") },
    { key: "continue", label: t("assistant.q.continue", "¿Qué estaba viendo?") },
  ]

  if (!question)
    return (
      <div className="space-y-3">
        <Bubble from="muneco">{t("assistant.hello", "¡Hola! Soy {name}. ¿En qué te ayudo?", { name: ASSISTANT_NAME })}</Bubble>
        <div className="flex flex-col items-end gap-2">
          {questions.map((q) => (
            <button
              key={q.key}
              onClick={() => {
                trackActivity("assistant_question", q.key)
                setQuestion(q.key)
              }}
              className="rounded-full border border-neon-cyan/40 px-4 py-2 text-left text-[13px] font-medium text-neon-cyan hover:bg-neon-cyan/10"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-3">
      <button onClick={() => setQuestion(null)} className="flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white">
        <ChevronLeft className="h-4 w-4" />
        {t("assistant.back", "Otras preguntas")}
      </button>
      <Bubble from="user">{questions.find((q) => q.key === question)?.label}</Bubble>

      {question === "start" && (
        <>
          <Bubble from="muneco">
            {t("assistant.a.start", "Lo mejor es empezar por el test inicial: son 3 preguntas y te digo qué conceptos trabajar primero.")}
          </Bubble>
          <div className="flex flex-wrap gap-2">
            <PanelLink to={testHref("assistant")} onNavigate={onNavigate} primary>
              {t("assistant.a.start.test", "Hacer el test")}
            </PanelLink>
            <PanelLink to="/app/como-funciona" onNavigate={onNavigate}>
              {t("assistant.a.start.how", "Cómo funciona PFR")}
            </PanelLink>
          </div>
        </>
      )}

      {question === "new" && (
        <>
          <Bubble from="muneco">{t("assistant.a.new", "Esto es lo último que ha llegado:")}</Bubble>
          <NewItems onNavigate={onNavigate} />
        </>
      )}

      {question === "improve" && (
        <>
          <Bubble from="muneco">{t("assistant.a.improve", "¿Qué parte quieres trabajar? Te enseño los clips de ese bloque.")}</Bubble>
          <div className="flex flex-wrap gap-2">
            {blocks
              .filter((b) => b.id != null)
              .map((b) => (
                <PanelLink key={b.id} to={blockSearchHref(b.id!)} onNavigate={onNavigate}>
                  {pickText(b.nameEs, b.nameEn, lang)}
                </PanelLink>
              ))}
          </div>
        </>
      )}

      {question === "continue" && (
        <>
          <Bubble from="muneco">{t("assistant.a.continue", "En tu historial tienes todo lo que has visto, con lo que te queda de cada vídeo.")}</Bubble>
          <PanelLink to="/app/historial" onNavigate={onNavigate} primary>
            {t("assistant.a.continue.cta", "Ir al historial")}
          </PanelLink>
        </>
      )}
    </div>
  )
}

/**
 * Debajo de una respuesta de cuenta, pagos o incidencias: manda la conversación a Soporte (Admin →
 * Feedback) para que le contestemos por email. Además siempre queda hello@ a mano.
 */
const SupportButton = ({ index, sent }: { index: number; sent?: boolean }) => {
  const { t } = useI18n()
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle")
  if (sent)
    return (
      <p className="flex items-center gap-1.5 text-xs text-neon-cyan">
        <Check className="h-4 w-4" />
        {t("assistant.support.sent", "Enviada a Soporte. Te responderemos por email.")}
      </p>
    )
  const send = async () => {
    setStatus("sending")
    setStatus((await sendChatToSupport(index)) ? "idle" : "error")
  }
  return (
    <div className="space-y-1.5">
      <button
        onClick={send}
        disabled={status === "sending"}
        className="inline-flex items-center gap-1.5 rounded-full border border-neon-cyan/50 px-4 py-2 text-[13px] font-semibold text-neon-cyan transition hover:bg-neon-cyan/10 disabled:opacity-50"
      >
        <LifeBuoy className="h-4 w-4" />
        {status === "sending" ? t("assistant.support.sending", "Enviando…") : t("assistant.support.send", "Enviar esta conversación a Soporte")}
      </button>
      {status === "error" && (
        <p className="text-xs text-amber-300">
          {t("assistant.support.error", "No se ha podido enviar. Escríbenos a hello@padelfilmroom.com.")}
        </p>
      )}
    </div>
  )
}

/** Conversación con el chat (fase 1): mensajes, tarjetas de los clips recomendados y «pensando». */
const ChatThread = ({ onNavigate }: { onNavigate: () => void }) => {
  const { t } = useI18n()
  const chat = useAssistantChat()
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [chat.messages.length, chat.sending])
  return (
    <div className="space-y-3">
      <button onClick={resetChat} className="flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white">
        <ChevronLeft className="h-4 w-4" />
        {t("assistant.chat.new", "Nueva conversación")}
      </button>
      {chat.messages.map((m, i) => (
        <div key={i} className="space-y-2">
          <Bubble from={m.role === "user" ? "user" : "muneco"}>{m.text}</Bubble>
          {m.items && m.items.length > 0 && <ItemList items={m.items} onNavigate={onNavigate} fromChat />}
          {m.support && <SupportButton index={i} sent={m.supportSent} />}
        </div>
      ))}
      {chat.sending && (
        <p className="flex items-center gap-2 text-sm text-white/60">
          <Pafri pose="pensando" size={32} />
          <span className="animate-pulse">{t("assistant.chat.thinking", "{name} está pensando…", { name: ASSISTANT_NAME })}</span>
        </p>
      )}
      <div ref={end} />
    </div>
  )
}

/** Caja para escribir al chat, con los mensajes que quedan este mes. */
const ChatInput = ({ usage }: { usage: AssistantUsage }) => {
  const { t, lang } = useI18n()
  const chat = useAssistantChat()
  const [draft, setDraft] = useState("")
  const remaining = usage.limit == null ? 0 : Math.max(usage.limit - usage.used, 0)
  const disabled = chat.sending || remaining === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    setDraft("")
    if (!(await sendChatMessage(text, lang))) setDraft(text)
  }

  const error =
    chat.error === "limit" || remaining === 0
      ? t("assistant.chat.error.limit", "Has usado los {limit} mensajes de este mes. El día 1 vuelves a tenerlos.", { limit: usage.limit ?? 0 })
      : chat.error === "unavailable"
        ? t("assistant.chat.error.unavailable", "Ahora mismo no puedo responder. Prueba en un rato.")
        : chat.error === "other"
          ? t("assistant.chat.error.other", "No se ha podido enviar. Prueba otra vez.")
          : null

  return (
    <div className="space-y-2 border-t border-white/10 pt-3">
      {error && <p className="text-xs text-amber-300">{error}</p>}
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={1000}
          disabled={remaining === 0}
          placeholder={t("assistant.chat.placeholder", "Cuéntame una situación de tu juego…")}
          aria-label={t("assistant.chat.placeholder", "Cuéntame una situación de tu juego…")}
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/60 focus:outline-none disabled:opacity-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          aria-label={t("assistant.chat.send", "Enviar")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neon-cyan text-midnight disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
      <p className="text-[11px] leading-snug text-white/40">
        {t("assistant.chat.remaining", "Te quedan {remaining} de {limit} mensajes este mes.", { remaining, limit: usage.limit ?? 0 })}{" "}
        {t("assistant.chat.privacy", "Guardamos las conversaciones 12 meses para mejorar el asistente.")}
      </p>
    </div>
  )
}

/** Una conversación del historial: la primera pregunta, la hora y cuántos clips recomendó. */
const SavedChatRow = ({ chat, current, onOpen }: { chat: SavedChat; current?: boolean; onOpen: () => void }) => {
  const { t, lang } = useI18n()
  const first = chat.messages.find((m) => m.role === "user")?.text ?? ""
  const clips = chat.messages.reduce((n, m) => n + (m.items?.length ?? 0), 0)
  const time = new Date(chat.startedAt).toLocaleTimeString(lang === "en" ? "en-US" : "es-ES", { hour: "2-digit", minute: "2-digit" })
  return (
    <button onClick={onOpen} className="w-full rounded-xl border border-white/10 p-3 text-left hover:bg-white/5">
      <span className="line-clamp-2 text-sm leading-snug text-white">{first}</span>
      <span className="mt-1 block text-[11px] text-white/50">
        {time}
        {clips > 0 && ` · ${clips === 1 ? t("assistant.history.clips.one", "1 clip") : t("assistant.history.clips", "{count} clips", { count: clips })}`}
        {current && ` · ${t("assistant.history.current", "la de ahora")}`}
      </span>
    </button>
  )
}

/** Historial: las conversaciones de las últimas 24 h (la de ahora primero), para volver a cualquiera. */
const HistoryList = ({ onClose }: { onClose: () => void }) => {
  const { t } = useI18n()
  const chat = useAssistantChat()
  const current = currentAsSaved(chat)
  return (
    <div className="space-y-3">
      <button onClick={onClose} className="flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white">
        <ChevronLeft className="h-4 w-4" />
        {t("assistant.history.back", "Volver")}
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{t("assistant.history.title", "Tus conversaciones")}</p>
      {!current && chat.history.length === 0 ? (
        <p className="text-sm text-white/60">{t("assistant.history.empty", "Aquí verás tus conversaciones para volver a ellas.")}</p>
      ) : (
        <div className="space-y-2">
          {current && <SavedChatRow chat={current} current onOpen={onClose} />}
          {chat.history.map((h) => (
            <SavedChatRow
              key={h.conversationId}
              chat={h}
              onOpen={() => {
                openSavedChat(h.conversationId)
                onClose()
              }}
            />
          ))}
        </div>
      )}
      <p className="text-[11px] leading-snug text-white/40">{t("assistant.history.note", "Se guardan en este dispositivo 24 horas desde el último mensaje.")}</p>
    </div>
  )
}

/** Club y Coach: preguntas típicas o la conversación y, debajo, la caja del chat (si está disponible). */
const ClubPanel = ({ onNavigate, showHistory, onCloseHistory }: { onNavigate: () => void; showHistory: boolean; onCloseHistory: () => void }) => {
  const { t } = useI18n()
  const chat = useAssistantChat()
  const { data } = useApi(getAssistantUsage, [], "assistant-usage")
  const usage = chat.usage ?? (data && "used" in data ? data : null)
  if (showHistory) return <HistoryList onClose={onCloseHistory} />
  return (
    <div className="space-y-4">
      {chat.messages.length > 0 ? <ChatThread onNavigate={onNavigate} /> : <TypicalQuestions onNavigate={onNavigate} />}
      {usage?.available ? (
        <ChatInput usage={usage} />
      ) : (
        usage && <p className="border-t border-white/10 pt-3 text-xs text-white/40">{t("assistant.chat.soon", "Muy pronto podrás preguntarme lo que quieras.")}</p>
      )}
    </div>
  )
}

/** Essential: solo el adelanto, sin preguntas. */
const StarterPanel = ({ onNavigate }: { onNavigate: () => void }) => {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-white/80">
        {t(
          "assistant.starter.intro",
          "En Club y Coach, el asistente te recomienda clips, píldoras y análisis según lo que le preguntes y lo que ya has visto, y te avisa de lo nuevo que te interesa.",
        )}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{t("assistant.starter.example", "Un ejemplo")}</p>
      <Bubble from="user">{t("assistant.starter.example.q", "Me cuesta la bandeja cuando me sacan de la pista.")}</Bubble>
      <Bubble from="muneco">
        {t(
          "assistant.starter.example.a",
          "Mira estos tres clips de bandeja en defensa y, después, el capítulo 4 del análisis de la final: ahí se ve la misma situación en un partido completo.",
        )}
      </Bubble>
      <PanelLink
        to="/app/precios"
        onNavigate={() => {
          trackActivity("assistant_upgrade_click")
          onNavigate()
        }}
        primary
      >
        {t("assistant.starter.cta", "Pasarme a Club")}
      </PanelLink>
    </div>
  )
}

const MunecoPanel = ({
  isClub,
  onNavigate,
  showHistory,
  onCloseHistory,
}: {
  isClub: boolean
  onNavigate: () => void
  showHistory: boolean
  onCloseHistory: () => void
}) => (isClub ? <ClubPanel onNavigate={onNavigate} showHistory={showHistory} onCloseHistory={onCloseHistory} /> : <StarterPanel onNavigate={onNavigate} />)

export default MunecoPanel
