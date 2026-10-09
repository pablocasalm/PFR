import { useEffect, useRef, useState } from "react"
import { ChevronDown, MessagesSquare, Send } from "lucide-react"
import { getAnalysisMessages, sendAnalysisMessage, type ThreadSide } from "../../../lib/api/personalAnalysis"
import { onHubEvent, type CoachMessage } from "../../../lib/realtime/accountHub"
import { applyAccountState, getAuthUser } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"

/**
 * Hilo de mensajes de un análisis de Coach, entre el alumno y quien lo analiza: una duda sobre
 * el vídeo antes de analizarlo ("¿eres el de rojo?"), o lo que vaya surgiendo durante el mes.
 * Lo usan los dos lados con el mismo componente (`side`): el alumno en Coach y el equipo en el
 * panel de admin.
 *
 * Va plegado, con el número de mensajes y los que hay sin leer. Al abrirlo se cargan y quedan
 * leídos. Los mensajes del otro lado llegan en tiempo real (canal de SignalR): si el hilo está
 * abierto se añaden al momento; si no, sube el contador.
 */
const AnalysisThread = ({
  requestId,
  side,
  messageCount = 0,
  unread = 0,
}: {
  requestId: number
  side: ThreadSide
  messageCount?: number
  unread?: number
}) => {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<CoachMessage[] | null>(null)
  const [count, setCount] = useState(messageCount)
  const [pending, setPending] = useState(unread) // sin leer en este hilo
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  // Copias para leerlas desde el aviso en tiempo real y al cargar, sin depender del render.
  const openRef = useRef(open)
  const pendingRef = useRef(pending)
  useEffect(() => {
    openRef.current = open
    pendingRef.current = pending
  })

  const mine = (m: CoachMessage) => m.fromStaff === (side === "staff")

  /** Resta del contador general (el punto del menú) lo que se acaba de leer aquí. */
  const consume = (n: number) => {
    if (n <= 0) return
    const current = getAuthUser()?.coachUnread ?? 0
    applyAccountState({ coachUnread: Math.max(0, current - n) })
  }

  const load = async () => {
    try {
      const list = await getAnalysisMessages(side, requestId)
      setMessages(list)
      setCount(list.length)
      consume(pendingRef.current)
      setPending(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("coach.thread.error-load", "No se pudieron cargar los mensajes."))
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  // Mensajes del otro lado, en directo.
  useEffect(
    () =>
      onHubEvent("coachMessage", (m) => {
        if (m.requestId !== requestId || m.fromStaff === (side === "staff")) return
        if (openRef.current) {
          setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev))
          setCount((n) => n + 1)
          // Ya lo está viendo: se marca leído en el servidor y no cuenta en el menú.
          getAnalysisMessages(side, requestId).catch(() => {})
          consume(1)
        } else {
          setCount((n) => n + 1)
          setPending((n) => n + 1)
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestId, side],
  )

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" })
  }, [messages, open])

  const send = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    setError(null)
    try {
      const sent = await sendAnalysisMessage(side, requestId, body)
      setMessages((prev) => [...(prev ?? []), sent])
      setCount((n) => n + 1)
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("coach.thread.error-send", "No se pudo enviar el mensaje."))
    } finally {
      setBusy(false)
    }
  }

  const when = (iso: string) =>
    new Date(iso).toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

  return (
    <div className={`rounded-xl border bg-white/[0.02] ${pending > 0 ? "border-neon-cyan/40" : "border-white/10"}`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-left">
        <MessagesSquare className="h-4 w-4 shrink-0 text-neon-cyan" />
        <span className="text-sm font-semibold text-white">
          {side === "staff" ? t("coach.thread.title-staff", "Mensajes con el alumno") : t("coach.thread.title", "Mensajes sobre este análisis")}
        </span>
        {count > 0 && <span className="text-xs tabular-nums text-white/45">{count}</span>}
        {pending > 0 && (
          <span className="rounded-full bg-neon-cyan px-2 py-0.5 text-[11px] font-bold text-midnight">
            {pending === 1 ? t("coach.thread.new-one", "1 nuevo") : t("coach.thread.new-many", "{n} nuevos", { n: pending })}
          </span>
        )}
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 px-4 py-3">
          {messages === null && !error && <p className="text-xs text-white/40">{t("common.loading", "Cargando...")}</p>}
          {messages?.length === 0 && (
            <p className="text-sm leading-relaxed text-white/50">
              {side === "staff"
                ? t("coach.thread.empty-staff", "Todavía no hay mensajes. Escríbele si necesitas aclarar algo del vídeo.")
                : t("coach.thread.empty", "Todavía no hay mensajes. Escríbenos si quieres comentar algo de este análisis.")}
            </p>
          )}
          {messages && messages.length > 0 && (
            <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
              {messages.map((m) => (
                <li key={m.id} className={`flex ${mine(m) ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${mine(m) ? "bg-neon-cyan/15 text-white" : "bg-white/[0.06] text-white/90"}`}>
                    <p className="mb-0.5 text-[11px] text-white/45">
                      {mine(m) ? t("coach.thread.you", "Tú") : m.authorName} · {when(m.createdAtUtc)}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.text}</p>
                  </div>
                </li>
              ))}
              <div ref={endRef} />
            </ul>
          )}

          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={side === "staff" ? t("coach.thread.placeholder-staff", "Escribe al alumno…") : t("coach.thread.placeholder", "Escribe tu mensaje…")}
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
            />
            <button
              type="button"
              onClick={send}
              disabled={!text.trim() || busy}
              aria-label={t("coach.thread.send", "Enviar")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neon-cyan text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalysisThread
