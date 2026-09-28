import { useState } from "react"
import { Crown, Send, ArrowRight } from "lucide-react"
import { Link, Navigate } from "react-router-dom"
import { useApi } from "../../../lib/hooks/useApi"
import { getMonthlyPick } from "../../../lib/api/club"
import { getSessionsArchive } from "../../../lib/api/sessions"
import { getMyQuestions, sendQuestion, type MySessionQuestion } from "../../../lib/api/sessionQuestions"
import { CardGridSkeleton } from "../../../lib/ui/Skeleton"
import CardRow from "../../../lib/ui/CardRow"
import ContentCard from "../components/ContentCard"
import SessionCard from "../components/SessionCard"
import { useAuth, hasFeature } from "../../../lib/auth/store"
import { useI18n } from "../../../lib/i18n/store"
import { pickText } from "../../../lib/i18n/content"

/**
 * Club — hub de las funciones del plan Club (§Stripe 3 planes, §rediseño Club/Coach). Quien no
 * llega a Club se manda directo a /app/precios (ver el guard al principio de Club) — antes se
 * dejaba entrar a los 3 tiers con cada sección borrosa, pero se veía mal y se abandonó ese
 * enfoque; el único sitio que sigue mostrando un escaparate borroso es el banner de Inicio.
 * "Mi análisis" (Coach) vive aparte, en Coach.tsx.
 *
 * Layout en dos columnas desde `lg`: columna principal con Recomendado del mes y una fila
 * ACOTADA de sesiones (nunca el grid completo — eso crece sin tope mes a mes, ver
 * SesionesArchivo.tsx) + columna lateral fija con Preguntas, que al ser una acción puntual (no
 * contenido que se acumula) no debe depender de cuánto haya crecido lo demás para seguir
 * visible sin desplazarse.
 *
 * Fase 1: "Recomendado del mes". Fase 2: Sesiones grabadas. Fase 3: Preguntas para la sesión.
 */

/** Cuántas sesiones caben en la fila del hub antes de mandar al archivo completo. */
const SESSIONS_PREVIEW_COUNT = 6

/** Tarjeta pequeña de preguntas — no es pantalla propia, vive junto a Sesiones. */
const QuestionsCard = () => {
  const { t } = useI18n()
  const { data, loading } = useApi(getMyQuestions, [], "my-questions")
  const [items, setItems] = useState<MySessionQuestion[] | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const list = items ?? data ?? []

  const submit = async () => {
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError(null)
    try {
      const created = await sendQuestion(message)
      setItems([created, ...list])
      setText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : t("club.questions.error", "No se pudo enviar la pregunta."))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-white">{t("club.questions.title", "Preguntas para la próxima sesión")}</h2>
      {/* Siempre en columna, nunca lado a lado: esta tarjeta vive en una barra lateral estrecha
          (320px), no a lo ancho — un `sm:flex-row` respondería al ancho del viewport, no al del
          contenedor, y quedaría apretado igualmente aquí. */}
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t("club.questions.placeholder", "¿Qué quieres que tratemos en la próxima sesión?")}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || sending}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-semibold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {t("club.questions.send", "Enviar")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {!loading && list.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
          {list.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-white/80">{q.message}</span>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                  q.answered ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-amber-400/40 bg-amber-400/10 text-amber-300"
                }`}
              >
                {q.answered ? t("club.questions.answered", "Respondida") : t("club.questions.pending", "Pendiente")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const Club = () => {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const hasClub = hasFeature(user, "monthlyPicks")

  // Si no llega a Club, ni se piden estos datos: el backend los rechazaría igual (RequireTier),
  // pero así no se dispara la llamada justo antes de redirigir.
  const { data: monthlyPick, loading } = useApi(() => (hasClub ? getMonthlyPick() : Promise.resolve(null)), [hasClub], "monthly-pick")
  const { data: sessions, loading: sessionsLoading } = useApi(
    () => (hasClub ? getSessionsArchive() : Promise.resolve(null)),
    [hasClub],
    "club-sessions",
  )

  if (!hasClub) return <Navigate to="/app/precios" replace />

  const sessionsPreview = sessions?.slice(0, SESSIONS_PREVIEW_COUNT) ?? []

  return (
    <main className="w-full space-y-8 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Crown className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("club.title", "Club")}</h1>
          <p className="text-sm text-white/60">{t("club.subtitle", "Lo que trae tu plan, en un solo sitio.")}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Columna principal: contenido que crece con el tiempo. */}
        <div className="space-y-8">
          {/* Recomendado del mes primero: es la pieza más editorial del hub (curada por
              nuestro equipo), antes estaba la última, detrás de todo lo demás. */}
          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.12em] text-white">
              {t("club.monthly-pick.title", "Recomendado del mes")}
            </h2>

            {loading ? (
              <CardGridSkeleton count={4} />
            ) : !monthlyPick || monthlyPick.items.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
                {t("club.monthly-pick.empty", "Todavía no hay recomendación para este mes. Vuelve pronto.")}
              </p>
            ) : (
              <>
                {monthlyPick.note && (
                  <p className="mb-4 text-sm text-white/70">{pickText(monthlyPick.note, monthlyPick.noteEn ?? undefined, lang)}</p>
                )}
                {monthlyPick.concepts.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {monthlyPick.concepts.map((c) => (
                      <span key={c.name} className="rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-3 py-1 text-xs font-medium text-neon-cyan">
                        #{pickText(c.name, c.nameEn, lang)}
                      </span>
                    ))}
                  </div>
                )}
                <CardRow>
                  {monthlyPick.items.map((item) => (
                    <ContentCard key={item.id} item={item} />
                  ))}
                </CardRow>
              </>
            )}
          </section>

          {/* Sesiones: fila ACOTADA a SESSIONS_PREVIEW_COUNT, nunca el histórico completo —
              eso vive en /app/club/sesiones para que este hub no crezca sin tope mes a mes. */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{t("club.sessions.title", "Sesiones")}</h2>
              {sessions && sessions.length > 0 && (
                <Link to="/app/club/sesiones" className="flex items-center gap-1 text-xs font-medium text-neon-cyan transition hover:brightness-110">
                  {t("club.sessions.see-all", "Ver todas")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            {sessionsLoading ? (
              <CardGridSkeleton count={4} />
            ) : sessionsPreview.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/50">
                {t("club.sessions.empty", "Todavía no hay ninguna sesión grabada. Vuelve pronto.")}
              </p>
            ) : (
              <CardRow cols="sm:grid-cols-3 lg:grid-cols-3">
                {sessionsPreview.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </CardRow>
            )}
          </section>
        </div>

        {/* Columna lateral: Preguntas es una acción puntual, no contenido que se acumula —
            vive fija aquí para no depender de cuánto crezca la columna principal. */}
        <aside>
          <QuestionsCard />
        </aside>
      </div>
    </main>
  )
}

export default Club
