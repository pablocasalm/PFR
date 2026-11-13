import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useI18n } from "../../../../lib/i18n/store"
import type { MetricsDays } from "../../../../lib/api/metrics"
import {
  getAdminAssistantConversations,
  getAdminAssistantNotices,
  type AdminAssistantConversations,
  type AdminAssistantMessage,
  type AdminAssistantNotices,
} from "../../../../lib/api/assistant"
import { Bars, ChartCard } from "./Bars"

/**
 * Métricas → «Asistente» (el muñeco, tarjeta #147): si funcionan los avisos, cómo se usa el panel
 * (preguntas típicas, «Pasarme a Club» en Essential) y las conversaciones del chat, para revisarlas
 * con Andrea: qué recomendó, con qué confianza y qué se descartó por no existir. Las respuestas con
 * confianza baja apuntan a contenido que falta. Solo con VITE_ASSISTANT_ENABLED (ver AdminMetricas).
 */

const toDate = (iso: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`)

type ChatFilter = "all" | "low" | "dropped" | "outOfScope"

const MetricsAssistant = ({ days, excludeTeam }: { days: MetricsDays; excludeTeam: boolean }) => {
  const { t, lang } = useI18n()
  const [notices, setNotices] = useState<AdminAssistantNotices | null>(null)
  const [chats, setChats] = useState<AdminAssistantConversations | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ChatFilter>("all")
  const [open, setOpen] = useState<number | null>(null)

  // «Desde el inicio» (0): las conversaciones se borran a los 12 meses, así que basta con un año.
  const period = days === 0 ? 365 : days

  // Sin `t` en las dependencias: cambia en cada render (ver AdminEncuestas).
  useEffect(() => {
    let cancelled = false
    Promise.all([getAdminAssistantNotices(period), getAdminAssistantConversations(period)])
      .then(([n, c]) => {
        if (cancelled) return
        setNotices(n)
        setChats(c)
        setError(null)
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "No se pudieron cargar los datos del asistente."))
    return () => {
      cancelled = true
    }
  }, [period])

  if (error) return <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
  if (!notices || !chats) return <p className="text-sm text-white/50">{t("common.loading", "Cargando...")}</p>

  const locale = lang === "en" ? "en-US" : "es-ES"
  const when = (iso: string) => toDate(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
  const pct = (v: number, base: number) => (base > 0 ? `${Math.round((100 * v) / base)}%` : "—")

  const kindLabel: Record<string, string> = {
    resume_analysis: t("admin-assistant.kind.resume", "Análisis a medias"),
    new_session: t("admin-assistant.kind.session", "Masterclass nueva"),
    monthly_pick: t("admin-assistant.kind.pick", "Plan del mes"),
    welcome_back: t("admin-assistant.kind.back", "Vuelta tras 7 días"),
    saved_unwatched: t("admin-assistant.kind.saved", "Mi Lista sin ver"),
    generic_new: t("admin-assistant.kind.generic", "Novedades (Essential)"),
  }
  const questionLabel: Record<string, string> = {
    start: t("assistant.q.start", "Soy nuevo, ¿por dónde empiezo?"),
    new: t("assistant.q.new", "¿Qué hay nuevo?"),
    improve: t("assistant.q.improve", "Quiero mejorar una parte de mi juego"),
    continue: t("assistant.q.continue", "¿Qué estaba viendo?"),
  }

  const s = chats.summary
  const p = notices.panel
  const replies = (c: AdminAssistantConversations["conversations"][number]) => c.messages.filter((m) => m.role === "assistant")
  const conversations = chats.conversations
    .filter((c) => !excludeTeam || !c.isTeam)
    .filter((c) => {
      if (filter === "low") return replies(c).some((m) => m.confidence === "baja")
      if (filter === "dropped") return replies(c).some((m) => m.droppedIds)
      if (filter === "outOfScope") return replies(c).some((m) => m.outOfScope)
      return true
    })

  const latest = notices.latest.filter((n) => !excludeTeam || !n.isTeam).slice(0, 15)

  const cards = [
    { label: t("admin-assistant.card.conversations", "Conversaciones"), value: String(s.conversations) },
    { label: t("admin-assistant.card.replies", "Respuestas"), value: String(s.replies) },
    { label: t("admin-assistant.card.low", "Confianza baja"), value: `${s.lowConfidence} · ${pct(s.lowConfidence, s.replies)}` },
    { label: t("admin-assistant.card.out", "Fuera de alcance"), value: `${s.outOfScope} · ${pct(s.outOfScope, s.replies)}` },
    { label: t("admin-assistant.card.dropped", "Con descartes"), value: String(s.withDropped) },
    {
      label: t("admin-assistant.card.tokens", "Tokens (entrada / salida / caché)"),
      value: `${Math.round(s.inputTokens / 1000)}k / ${Math.round(s.outputTokens / 1000)}k / ${Math.round(s.cacheReadTokens / 1000)}k`,
    },
  ]

  return (
    <div className="space-y-8">
      <p className="text-xs text-white/40">
        {t("admin-assistant.team-note", "Los resúmenes no cuentan nunca las cuentas del equipo; la lista de conversaciones sigue el filtro «Excluir cuentas del equipo».")}
      </p>

      {/* Avisos y panel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title={t("admin-assistant.notices", "Avisos")} hint={t("admin-assistant.notices-hint", "Mostrados por tipo; debajo, cuántos se pulsaron o se cerraron.")}>
          <Bars
            rows={notices.summary.map((n) => ({
              label: kindLabel[n.kind] ?? n.kind,
              value: n.shown,
              hint: t("admin-assistant.notice-row", "Pulsados {clicked} ({clickedPct}) · cerrados {dismissed}", {
                clicked: n.clicked,
                clickedPct: pct(n.clicked, n.shown),
                dismissed: n.dismissed,
              }),
            }))}
            empty={t("admin-assistant.empty", "Todavía no hay datos.")}
          />
        </ChartCard>
        <ChartCard
          title={t("admin-assistant.panel", "Panel")}
          hint={t("admin-assistant.panel-hint", "{opens} aperturas de {users} personas. Preguntas típicas pulsadas:", { opens: p.opens, users: p.openUsers })}
        >
          <Bars
            rows={p.questions.map((q) => ({ label: questionLabel[q.question] ?? q.question, value: q.count }))}
            empty={t("admin-assistant.empty", "Todavía no hay datos.")}
          />
          <p className="mt-4 border-t border-white/10 pt-3 text-sm text-white/70">
            {t("admin-assistant.upgrade", "Essential: {clicks} clics en «Pasarme a Club» de {users} personas; {upgraded} subieron después a Club o Coach.", {
              clicks: p.upgradeClicks,
              users: p.upgradeClickUsers,
              upgraded: p.upgradedAfterClick,
            })}
          </p>
        </ChartCard>
      </div>

      {/* Últimos avisos, uno a uno (con las cuentas del equipo si no se excluyen: sirve para probar). */}
      <ChartCard title={t("admin-assistant.latest", "Últimos avisos")}>
        {latest.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-assistant.empty", "Todavía no hay datos.")}</p>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {latest.map((n) => (
              <li key={n.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {kindLabel[n.kind] ?? n.kind} <span className="text-white/40">· {n.email}</span>
                </span>
                <span className="shrink-0 text-xs text-white/50">
                  {when(n.shownAtUtc)} ·{" "}
                  {n.clickedAtUtc
                    ? t("admin-assistant.clicked", "pulsado")
                    : n.dismissedAtUtc
                      ? t("admin-assistant.dismissed", "cerrado")
                      : t("admin-assistant.ignored", "sin tocar")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartCard>

      {/* Chat */}
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("admin-assistant.chat", "Chat")}</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs text-white/50">{c.label}</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {(
            [
              ["all", t("admin-assistant.filter.all", "Todas")],
              ["low", t("admin-assistant.filter.low", "Con confianza baja")],
              ["dropped", t("admin-assistant.filter.dropped", "Con descartes")],
              ["outOfScope", t("admin-assistant.filter.out", "Fuera de alcance")],
            ] as [ChatFilter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === id ? "border-neon-cyan bg-neon-cyan/10 text-neon-cyan" : "border-white/15 text-white/60"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {conversations.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-assistant.no-conversations", "No hay conversaciones en este periodo.")}</p>
        ) : (
          <ul className="space-y-2">
            {conversations.map((c) => {
              const first = c.messages.find((m) => m.role === "user")
              const isOpen = open === c.id
              return (
                <li key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02]">
                  <button onClick={() => setOpen(isOpen ? null : c.id)} className="flex w-full flex-col gap-1 p-3 text-left sm:flex-row sm:items-center sm:gap-4">
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{first?.text ?? "—"}</span>
                    <span className="shrink-0 text-xs text-white/40">
                      {c.email}
                      {c.isTeam ? ` · ${t("admin-assistant.team", "equipo")}` : ""} · {c.planTier} · {c.language.toUpperCase()} · {when(c.lastMessageAtUtc)} ·{" "}
                      {t("admin-assistant.messages", "{count} mensajes", { count: c.messages.length })}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 border-t border-white/10 p-3">
                      {c.messages.map((m, i) => (
                        <Message key={i} message={m} />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Un mensaje de la conversación; las respuestas, con lo que eligió el modelo y lo descartado. */
const Message = ({ message: m }: { message: AdminAssistantMessage }) => {
  const { t } = useI18n()
  if (m.role === "user") return <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-neon-cyan/15 px-3.5 py-2 text-sm text-neon-cyan">{m.text}</p>
  const clips = m.clipIds ? m.clipIds.split(",").filter(Boolean) : []
  const tone = m.confidence === "baja" ? "text-amber-300" : m.confidence === "media" ? "text-white/70" : "text-emerald-300"
  return (
    <div className="max-w-[85%] space-y-1.5 rounded-2xl rounded-tl-sm bg-white/[0.06] px-3.5 py-2 text-sm text-white">
      <p>{m.text}</p>
      <p className="text-xs text-white/50">
        {m.concepts ? `${t("admin-assistant.concepts", "Conceptos")}: ${m.concepts.replaceAll(",", ", ")} · ` : ""}
        <span className={tone}>{t("admin-assistant.confidence", "Confianza {value}", { value: m.confidence ?? "—" })}</span>
        {m.outOfScope ? ` · ${t("admin-assistant.out-of-scope", "fuera de alcance")}` : ""}
        {` · ${m.inputTokens + m.cacheReadTokens + m.cacheWriteTokens}/${m.outputTokens} tokens`}
      </p>
      {clips.length > 0 && (
        <p className="flex flex-wrap gap-1.5 text-xs">
          {clips.map((id) => (
            <Link key={id} to={`/app/watch?c=${id}`} className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-white/70 hover:text-white">
              {id}
            </Link>
          ))}
        </p>
      )}
      {m.droppedIds && (
        <p className="text-xs text-red-300">
          {t("admin-assistant.dropped", "Descartado (no existe o no encaja)")}: {m.droppedIds}
        </p>
      )}
    </div>
  )
}

export default MetricsAssistant
