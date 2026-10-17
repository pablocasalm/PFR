import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Ticket, Copy, Check, Trash2, Mail, Send, ChevronDown, Megaphone } from "lucide-react"
import {
  generateInvites,
  sendAnnounce,
  sendAnnounceTest,
  listInvites,
  deleteInvite,
  listInviteRequests,
  deleteInviteRequest,
  sendInviteTestEmails,
  sendBetaEmailsTest,
  sendMasterclassNotice,
  type InviteCode,
  type InviteStatus,
  type InviteRequestItem,
  type BillingPlan,
} from "../../../lib/api/invites"
import { useI18n } from "../../../lib/i18n/store"

/**
 * AdminInvites — gestión de invitaciones de la beta (solo Admin). Genera y envía códigos,
 * y lista todos los generados con su estado (pendiente/usado), email, fechas y link. Permite
 * eliminar códigos.
 */

// Acepta emails separados por comas, espacios, punto y coma o saltos de línea; deduplica.
const parseEmails = (raw: string): string[] => {
  const set = new Set<string>()
  raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .forEach((e) => {
      if (e && e.includes("@")) set.add(e)
    })
  return [...set]
}

const fmt = (iso: string | null, lang: string): string => {
  if (!iso) return "—"
  // El backend envía las fechas en UTC pero a veces sin marca de zona ('Z'). Si no la trae,
  // la forzamos a UTC para que toLocaleString la convierta bien a la hora local (Madrid).
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(lang === "en" ? "en-US" : "es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

type Filter = "all" | "pending" | "used" | "expired"

// Por si la API todavía no manda el estado (servidor sin publicar): usado o pendiente.
const statusOf = (c: InviteCode): InviteStatus => c.status ?? (c.used ? "activated" : "pending")
type InviteLang = "es" | "en"

/** Selector Español / English: el mismo para las invitaciones manuales y para "Invitar". */
const LangToggle = ({ value, onChange }: { value: InviteLang; onChange: (l: InviteLang) => void }) => (
  <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
    {(["es", "en"] as const).map((l) => (
      <button
        key={l}
        type="button"
        onClick={() => onChange(l)}
        aria-pressed={value === l}
        className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
          value === l ? "bg-neon-cyan text-midnight" : "text-white/60 hover:text-white"
        }`}
      >
        {l === "es" ? "Español" : "English"}
      </button>
    ))}
  </div>
)

/** Ventana pequeña centrada (abajo en móvil). Se cierra pulsando fuera. */
const Dialog = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    onClick={onClose}
  >
    <div
      className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-midnight p-5 sm:p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      {children}
    </div>
  </div>
)

const AdminInvites = () => {
  const { t, lang } = useI18n()
  const [raw, setRaw] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  // Idioma del email de invitación (y preferido del usuario al canjearla) — se aplica a todo
  // el lote que se genere/envíe desde el textarea. "Invitar" en una solicitud pregunta el suyo.
  const [inviteLang, setInviteLang] = useState<InviteLang>("es")

  // Solicitudes pendientes (formulario público de la landing o "pedir otro código").
  const [requests, setRequests] = useState<InviteRequestItem[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null)
  // Plegado por defecto: esperamos que se acumulen muchas y no queremos que tapen el resto.
  const [requestsOpen, setRequestsOpen] = useState(false)
  // "Invitar" en una solicitud: antes de enviar se pregunta el idioma, preseleccionado con el
  // que la persona eligió en el email de acceso anticipado (o el de la landing), o español.
  const [inviteTarget, setInviteTarget] = useState<InviteRequestItem | null>(null)
  const [inviteTargetLang, setInviteTargetLang] = useState<InviteLang>("es")

  // Email de acceso anticipado a la lista de espera. Dos pasos a propósito: elegir destinatarios
  // ("pick") y confirmar ("confirm") — no sale ningún email real hasta el segundo.
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [announceStep, setAnnounceStep] = useState<"pick" | "confirm">("pick")
  const [announceIds, setAnnounceIds] = useState<Set<number>>(new Set())
  const [announceBusy, setAnnounceBusy] = useState(false)
  const [announceMsg, setAnnounceMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testTo, setTestTo] = useState("")

  // Envío de prueba de la invitación y los dos recordatorios, solo a una dirección.
  const [inviteTestTo, setInviteTestTo] = useState("")
  const [inviteTestBusy, setInviteTestBusy] = useState(false)
  const [inviteTestMsg, setInviteTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Aviso de masterclass: `masterclassCount` != null = diálogo de confirmación abierto.
  const [masterclassCount, setMasterclassCount] = useState<number | null>(null)
  const [masterclassBusy, setMasterclassBusy] = useState(false)
  const [masterclassMsg, setMasterclassMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const emails = parseEmails(raw)

  const refresh = async () => {
    setLoading(true)
    try {
      setCodes(await listInvites())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.load-codes", "No se pudo cargar la lista."))
    } finally {
      setLoading(false)
    }
  }

  const refreshRequests = async () => {
    setRequestsLoading(true)
    try {
      setRequests(await listInviteRequests())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.load-requests", "No se pudieron cargar las solicitudes."))
    } finally {
      setRequestsLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    refreshRequests()
  }, [])

  // Invita con un clic desde una solicitud pendiente: genera el código para ese email
  // (el backend marca la solicitud como atendida solo) y refresca las dos listas.
  const inviteFromRequest = async (email: string, language: InviteLang) => {
    setInviteTarget(null)
    setInvitingEmail(email)
    setError(null)
    setNotice(null)
    try {
      await generateInvites([email], language)
      setNotice(t("admin-invites.notice.sent-one", "Invitación generada y enviada a {email}.", { email }))
      await Promise.all([refresh(), refreshRequests()])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.generate-one", "No se pudo generar la invitación."))
    } finally {
      setInvitingEmail(null)
    }
  }

  const askInviteLanguage = (r: InviteRequestItem) => {
    setInviteTargetLang(r.language === "en" ? "en" : "es")
    setInviteTarget(r)
  }

  // Quién no ha recibido todavía el email de acceso anticipado y tampoco está confirmado: los
  // únicos a los que se puede enviar. Quien se apunta desde el 17/10 ya entra confirmado y no lo necesita.
  const notAnnounced = useMemo(() => requests.filter((r) => !r.announcedAtUtc && !r.confirmedAtUtc), [requests])
  const announcedCount = useMemo(() => requests.filter((r) => r.announcedAtUtc).length, [requests])

  const openAnnounce = () => {
    setAnnounceIds(new Set(notAnnounced.map((r) => r.id)))
    setAnnounceStep("pick")
    setAnnounceMsg(null)
    setAnnounceOpen(true)
  }

  const toggleAnnounceId = (id: number) =>
    setAnnounceIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const sendTest = async () => {
    const to = testTo.trim().toLowerCase()
    if (!to.includes("@") || announceBusy) return
    setAnnounceBusy(true)
    setAnnounceMsg(null)
    try {
      await sendAnnounceTest(to)
      setAnnounceMsg({ ok: true, text: t("admin-invites.announce.test-sent", "Prueba enviada a {email}. No se ha enviado a nadie más.", { email: to }) })
      await refreshRequests()
    } catch (err) {
      setAnnounceMsg({ ok: false, text: err instanceof Error ? err.message : t("admin-invites.announce.error", "No se pudo enviar el email.") })
    } finally {
      setAnnounceBusy(false)
    }
  }

  const sendAnnounceForReal = async () => {
    if (announceIds.size === 0 || announceBusy) return
    setAnnounceBusy(true)
    setAnnounceMsg(null)
    try {
      const res = await sendAnnounce([...announceIds])
      setAnnounceOpen(false)
      setNotice(
        res.sent === 1
          ? t("admin-invites.announce.sent-singular", "Email de acceso anticipado enviado a 1 persona.")
          : t("admin-invites.announce.sent-plural", "Email de acceso anticipado enviado a {count} personas.", { count: res.sent }),
      )
      await refreshRequests()
    } catch (err) {
      setAnnounceStep("pick")
      setAnnounceMsg({ ok: false, text: err instanceof Error ? err.message : t("admin-invites.announce.error", "No se pudo enviar el email.") })
    } finally {
      setAnnounceBusy(false)
    }
  }

  // Descarta una solicitud sin invitar (pruebas, email mal escrito).
  const removeRequest = async (r: InviteRequestItem) => {
    if (!window.confirm(t("admin-invites.confirm.discard-request", "¿Descartar la solicitud de {email}?", { email: r.email }))) return
    try {
      await deleteInviteRequest(r.id)
      setRequests((prev) => prev.filter((x) => x.id !== r.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.discard-request", "No se pudo descartar la solicitud."))
    }
  }

  const submit = async () => {
    if (emails.length === 0 || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const res = await generateInvites(emails, inviteLang)
      setNotice(
        res.length === 1
          ? t("admin-invites.notice.sent-singular", "1 invitación generada y enviada.")
          : t("admin-invites.notice.sent-plural", "{count} invitaciones generadas y enviadas.", { count: res.length }),
      )
      setRaw("")
      await Promise.all([refresh(), refreshRequests()])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.generate", "No se pudieron generar las invitaciones."))
    } finally {
      setSending(false)
    }
  }

  // `after`: los emails de después de activar la cuenta (encuestas, día 13 y masterclass); si
  // no, la invitación y los dos recordatorios.
  const sendInviteTest = async (after: boolean) => {
    const to = inviteTestTo.trim().toLowerCase()
    if (!to.includes("@") || inviteTestBusy) return
    setInviteTestBusy(true)
    setInviteTestMsg(null)
    try {
      if (after) await sendBetaEmailsTest(to, inviteLang)
      else await sendInviteTestEmails(to, inviteLang)
      setInviteTestMsg({
        ok: true,
        text: after
          ? t("admin-invites.test.sent-after", "Enviados a {email}: las encuestas de los días 4 y 12, el email del día 13 y el aviso de masterclass. No se ha enviado a nadie más.", { email: to })
          : t("admin-invites.test.sent", "Enviados a {email}: la invitación y los dos recordatorios, con un código de prueba. No se ha enviado a nadie más.", { email: to }),
      })
    } catch (err) {
      setInviteTestMsg({ ok: false, text: err instanceof Error ? err.message : t("admin-invites.announce.error", "No se pudo enviar el email.") })
    } finally {
      setInviteTestBusy(false)
    }
  }

  // Aviso de masterclass: primero se pide cuántos lo recibirían (sin enviar) y se confirma.
  const prepareMasterclass = async () => {
    if (masterclassBusy) return
    setMasterclassBusy(true)
    setMasterclassMsg(null)
    try {
      const res = await sendMasterclassNotice(true)
      setMasterclassCount(res.count)
    } catch (err) {
      setMasterclassMsg({ ok: false, text: err instanceof Error ? err.message : t("admin-invites.announce.error", "No se pudo enviar el email.") })
    } finally {
      setMasterclassBusy(false)
    }
  }

  const sendMasterclassForReal = async () => {
    if (masterclassBusy) return
    setMasterclassBusy(true)
    try {
      const res = await sendMasterclassNotice(false)
      setMasterclassCount(null)
      setMasterclassMsg({ ok: true, text: t("admin-invites.masterclass.sent", "Aviso enviado a {count} personas.", { count: res.count }) })
    } catch (err) {
      setMasterclassCount(null)
      setMasterclassMsg({ ok: false, text: err instanceof Error ? err.message : t("admin-invites.announce.error", "No se pudo enviar el email.") })
    } finally {
      setMasterclassBusy(false)
    }
  }

  // Quien dejó caducar su invitación pierde la plaza de esta beta, no su sitio en la lista: si
  // quedan plazas se le puede invitar de nuevo (código nuevo, otros 7 días).
  const reinvite = async (c: InviteCode) => {
    if (!window.confirm(t("admin-invites.confirm.reinvite", "¿Enviar una invitación nueva a {email}? Tendrá otros 7 días para crear su contraseña.", { email: c.email }))) return
    await inviteFromRequest(c.email, c.language === "en" ? "en" : "es")
  }

  const remove = async (c: InviteCode) => {
    if (!window.confirm(t("admin-invites.confirm.delete-code", "¿Eliminar el código de {email}?", { email: c.email }))) return
    try {
      await deleteInvite(c.id)
      setCodes((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin-invites.error.delete-code", "No se pudo eliminar el código."))
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* sin portapapeles */
    }
  }

  const usedCount = codes.filter((c) => statusOf(c) === "activated").length
  const pendingCount = codes.filter((c) => statusOf(c) === "pending").length
  const expiredCount = codes.filter((c) => statusOf(c) === "expired").length
  const filtered = useMemo(() => {
    if (filter === "pending") return codes.filter((c) => statusOf(c) === "pending")
    if (filter === "used") return codes.filter((c) => statusOf(c) === "activated")
    if (filter === "expired") return codes.filter((c) => statusOf(c) === "expired")
    return codes
  }, [codes, filter])

  const tabCls = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/70 hover:text-white"
    }`

  // Categoría de facturación (§base para Stripe) — solo informativo por ahora.
  const PLAN_LABEL: Record<BillingPlan, string> = {
    Free: t("mi-cuenta.plan.free", "Gratis"),
    TrialThenPaid: t("mi-cuenta.plan.trial", "Prueba 14 días"),
    Discounted: t("mi-cuenta.plan.discounted", "Descuento"),
  }
  const PLAN_CLS: Record<BillingPlan, string> = {
    Free: "border-white/15 bg-white/5 text-white/60",
    TrialThenPaid: "border-violet-400/40 bg-violet-400/10 text-violet-300",
    Discounted: "border-neon-lime/40 bg-neon-lime/10 text-neon-lime",
  }

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Ticket className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-invites.title", "Invitaciones")}</h1>
          <p className="text-sm text-white/60">{t("admin-invites.subtitle", "Genera, envía y gestiona los códigos de la beta.")}</p>
        </div>
      </div>

      {/* Generar */}
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">{t("admin-invites.new-emails", "Nuevos emails")}</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            placeholder={t("admin-invites.emails-placeholder", "Pega los emails separados por comas, espacios o saltos de línea...")}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-white/50">
            {emails.length === 1
              ? t("admin-invites.detected-singular", "1 email válido detectado.")
              : t("admin-invites.detected-plural", "{count} emails válidos detectados.", { count: emails.length })}
          </p>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-white">{t("admin-invites.language-label", "Idioma del email")}</span>
          <LangToggle value={inviteLang} onChange={setInviteLang} />
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}

        <button
          onClick={submit}
          disabled={emails.length === 0 || sending}
          className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? t("common.sending", "Enviando...") : t("admin-invites.generate-cta", "Generar y enviar ({count})", { count: emails.length })}
        </button>

        {/* Prueba: invitación + recordatorios a una sola dirección, en el idioma elegido arriba. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">{t("admin-invites.test.title", "Envío de prueba")}</p>
          <p className="mt-1 text-xs text-white/50">
            {t("admin-invites.test.help", "Solo a esta dirección y en el idioma elegido arriba. «Enviar prueba» manda la invitación y los dos recordatorios (a los 3 y a los 6 días), con un código que no sirve para registrarse. El otro botón manda las encuestas de los días 4 y 12, el email del día 13 y el aviso de masterclass.")}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={inviteTestTo}
              onChange={(e) => setInviteTestTo(e.target.value)}
              placeholder={t("admin-invites.test.placeholder", "tu@email.com")}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
            />
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => sendInviteTest(false)}
              disabled={!inviteTestTo.includes("@") || inviteTestBusy}
              className="rounded-lg border border-neon-cyan/40 px-4 py-2 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {inviteTestBusy ? t("common.sending", "Enviando...") : t("admin-invites.test.cta", "Enviar prueba")}
            </button>
            <button
              onClick={() => sendInviteTest(true)}
              disabled={!inviteTestTo.includes("@") || inviteTestBusy}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("admin-invites.test.cta-after", "Probar encuestas, día 13 y masterclass")}
            </button>
          </div>
          {inviteTestMsg && (
            <p className={`mt-2 text-xs ${inviteTestMsg.ok ? "text-neon-cyan" : "text-red-300"}`}>{inviteTestMsg.text}</p>
          )}
        </div>

        {/* Aviso de masterclass: envío único y real, a todos los usuarios con acceso. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-white">{t("admin-invites.masterclass.title", "Aviso de masterclass nueva")}</p>
          <p className="mt-1 text-xs text-white/50">
            {t("admin-invites.masterclass.help", "Cuando se publique una masterclass, avisa por email a todos los usuarios con acceso, cada uno en su idioma. Antes de enviar te dice a cuántas personas llegará.")}
          </p>
          <button
            onClick={prepareMasterclass}
            disabled={masterclassBusy}
            className="mt-3 flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Megaphone className="h-4 w-4" />
            {t("admin-invites.masterclass.cta", "Avisar de la masterclass")}
          </button>
          {masterclassMsg && (
            <p className={`mt-2 text-xs ${masterclassMsg.ok ? "text-neon-cyan" : "text-red-300"}`}>{masterclassMsg.text}</p>
          )}
        </div>

        {masterclassCount !== null && (
          <Dialog title={t("admin-invites.masterclass.title", "Aviso de masterclass nueva")} onClose={() => setMasterclassCount(null)}>
            <p className="mt-3 text-sm text-white">
              {t("admin-invites.masterclass.confirm", "Vas a enviar el aviso a {count} personas.", { count: masterclassCount })}
            </p>
            <p className="mt-2 text-sm text-amber-300">
              {t("admin-invites.masterclass.warning", "Es un envío real y no se puede deshacer. Haz antes la prueba a tu email.")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setMasterclassCount(null)}
                disabled={masterclassBusy}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white disabled:opacity-50"
              >
                {t("common.cancel", "Cancelar")}
              </button>
              <button
                onClick={sendMasterclassForReal}
                disabled={masterclassBusy || masterclassCount === 0}
                className="rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {masterclassBusy ? t("common.sending", "Enviando...") : t("admin-invites.announce.confirm-cta", "Sí, enviar ahora")}
              </button>
            </div>
          </Dialog>
        )}
      </div>

      {/* Solicitudes pendientes: gente que ha pedido acceso (landing o "pedir otro código").
          Plegado por defecto (§ esperamos que se acumulen muchas), mismo patrón que el
          historial de reportes resueltos en AdminFeedback. */}
      <div className="mt-10 max-w-2xl">
        <button
          onClick={() => setRequestsOpen((v) => !v)}
          aria-expanded={requestsOpen}
          className="flex w-full items-center gap-2 text-left text-sm font-bold uppercase tracking-wide text-white/70 transition hover:text-white"
        >
          <Mail className="h-4 w-4" />
          {t("admin-invites.pending-requests", "Solicitudes pendientes")} {!requestsLoading && `(${requests.length})`}
          <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${requestsOpen ? "rotate-180" : ""}`} />
        </button>

        {requestsOpen &&
          (requestsLoading ? (
            <p className="mt-4 text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
          ) : requests.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">{t("admin-invites.no-requests", "No hay solicitudes pendientes.")}</p>
          ) : (
            <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{t("admin-invites.announce.title", "Email de acceso anticipado")}</p>
                <p className="text-xs text-white/50">
                  {t("admin-invites.announce.status", "Enviado a {sent} · sin enviar a {pending}", { sent: announcedCount, pending: notAnnounced.length })}
                </p>
              </div>
              <button
                onClick={openAnnounce}
                className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:text-white"
              >
                <Megaphone className="h-3.5 w-3.5" />
                {t("admin-invites.announce.open", "Preparar envío")}
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white/90">{r.email}</p>
                    <p className="text-xs text-white/40">
                      {fmt(r.createdAtUtc, lang)}
                      {!r.confirmedAtUtc && r.language ? ` · ${r.language.toUpperCase()}` : ""}
                    </p>
                    {r.confirmedAtUtc ? (
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-0.5 text-[11px] font-semibold text-neon-lime">
                          {t("admin-invites.confirmed", "Confirmado")} · {(r.language ?? "es").toUpperCase()}
                        </span>
                        <span className="text-xs text-white/40">{fmt(r.confirmedAtUtc, lang)}</span>
                      </p>
                    ) : r.announcedAtUtc ? (
                      <p className="mt-1.5">
                        <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/50">
                          {t("admin-invites.not-confirmed", "Sin confirmar")}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => askInviteLanguage(r)}
                      disabled={invitingEmail !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-1.5 text-xs font-semibold text-neon-cyan transition hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {invitingEmail === r.email ? t("admin-invites.inviting", "Invitando...") : t("admin-invites.invite", "Invitar")}
                    </button>
                    <button
                      onClick={() => removeRequest(r)}
                      aria-label={t("admin-invites.discard-aria", "Descartar solicitud de {email}", { email: r.email })}
                      className="flex items-center rounded-lg p-1.5 text-white/40 transition hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            </>
          ))}
      </div>

      {/* "Invitar": elegir idioma antes de enviar. */}
      {inviteTarget && (
        <Dialog title={t("admin-invites.invite-dialog.title", "Enviar invitación")} onClose={() => setInviteTarget(null)}>
          <p className="mt-3 break-words text-sm text-white/80">
            {t("admin-invites.invite-dialog.question", "¿En qué idioma enviamos la invitación a {email}?", { email: inviteTarget.email })}
          </p>
          <div className="mt-4">
            <LangToggle value={inviteTargetLang} onChange={setInviteTargetLang} />
          </div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => setInviteTarget(null)}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
            >
              {t("common.cancel", "Cancelar")}
            </button>
            <button
              onClick={() => inviteFromRequest(inviteTarget.email, inviteTargetLang)}
              className="rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
            >
              {t("admin-invites.invite-dialog.send", "Enviar invitación")}
            </button>
          </div>
        </Dialog>
      )}

      {/* Email de acceso anticipado: prueba, destinatarios y confirmación final. */}
      {announceOpen && (
        <Dialog title={t("admin-invites.announce.title", "Email de acceso anticipado")} onClose={() => !announceBusy && setAnnounceOpen(false)}>
          {announceStep === "pick" ? (
            <>
              <p className="mt-2 text-sm text-white/60">
                {t(
                  "admin-invites.announce.intro",
                  "Avisa a la lista de espera de que abrimos, con un botón para confirmar su plaza. Es un único email, en español y en inglés.",
                )}
              </p>

              <label className="mt-5 block text-sm font-medium text-white">{t("admin-invites.announce.test-label", "1. Envíate una prueba")}</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder={t("admin-invites.announce.test-placeholder", "tu@email.com")}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
                />
                <button
                  onClick={sendTest}
                  disabled={!testTo.includes("@") || announceBusy}
                  className="shrink-0 rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 px-4 py-2.5 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("admin-invites.announce.test-cta", "Enviar prueba")}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-white/40">
                {t("admin-invites.announce.test-help", "Solo le llega a esa dirección. Los botones de la prueba funcionan de verdad.")}
              </p>

              {announceMsg && (
                <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${announceMsg.ok ? "bg-neon-cyan/10 text-neon-cyan" : "bg-red-500/10 text-red-300"}`}>
                  {announceMsg.text}
                </p>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-white">{t("admin-invites.announce.recipients", "2. Elige a quién se envía")}</span>
                <button
                  onClick={() => setAnnounceIds(announceIds.size === notAnnounced.length ? new Set() : new Set(notAnnounced.map((r) => r.id)))}
                  className="text-xs text-white/60 transition hover:text-white"
                >
                  {announceIds.size === notAnnounced.length
                    ? t("admin-invites.announce.select-none", "Quitar todos")
                    : t("admin-invites.announce.select-all", "Marcar todos")}
                </button>
              </div>
              {notAnnounced.length === 0 ? (
                <p className="mt-2 text-sm text-white/40">{t("admin-invites.announce.nobody", "Ya se ha enviado a toda la lista.")}</p>
              ) : (
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
                  {notAnnounced.map((r) => (
                    <li key={r.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-white/90">
                        <input
                          type="checkbox"
                          checked={announceIds.has(r.id)}
                          onChange={() => toggleAnnounceId(r.id)}
                          className="h-4 w-4 shrink-0 accent-[#28f0e0]"
                        />
                        <span className="min-w-0 truncate">{r.email}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {announcedCount > 0 && (
                <p className="mt-1.5 text-xs text-white/40">
                  {t("admin-invites.announce.already", "{count} ya lo recibieron y no aparecen aquí.", { count: announcedCount })}
                </p>
              )}

              <p className="mt-5 text-xs text-white/50">
                {t("admin-invites.announce.two-steps", "Este botón todavía no envía nada: en el siguiente paso tendrás que confirmarlo.")}
              </p>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setAnnounceOpen(false)}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {t("common.cancel", "Cancelar")}
                </button>
                <button
                  onClick={() => setAnnounceStep("confirm")}
                  disabled={announceIds.size === 0 || announceBusy}
                  className="rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("admin-invites.announce.review", "Revisar envío ({count})", { count: announceIds.size })}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-white">
                {announceIds.size === 1
                  ? t("admin-invites.announce.confirm-singular", "Vas a enviar el email a 1 persona de la lista de espera.")
                  : t("admin-invites.announce.confirm-plural", "Vas a enviar el email a {count} personas de la lista de espera.", { count: announceIds.size })}
              </p>
              <p className="mt-2 text-sm text-amber-300">
                {t("admin-invites.announce.confirm-warning", "Es un envío real y no se puede deshacer. No se envía hasta que pulses «Sí, enviar ahora».")}
              </p>
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-3 text-xs text-white/70">
                {notAnnounced
                  .filter((r) => announceIds.has(r.id))
                  .map((r) => (
                    <li key={r.id} className="truncate">{r.email}</li>
                  ))}
              </ul>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setAnnounceStep("pick")}
                  disabled={announceBusy}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:text-white disabled:opacity-50"
                >
                  {t("admin-invites.announce.back", "Volver")}
                </button>
                <button
                  onClick={sendAnnounceForReal}
                  disabled={announceBusy}
                  className="rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {announceBusy ? t("common.sending", "Enviando...") : t("admin-invites.announce.confirm-cta", "Sí, enviar ahora")}
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}

      {/* Lista */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-bold uppercase tracking-wide text-white/70">{t("admin-invites.codes", "Códigos")}</h2>
          <button onClick={() => setFilter("all")} className={tabCls(filter === "all")}>{t("explorar.type.all", "Todos")} ({codes.length})</button>
          <button onClick={() => setFilter("pending")} className={tabCls(filter === "pending")}>{t("admin-invites.pending", "Pendientes")} ({pendingCount})</button>
          <button onClick={() => setFilter("used")} className={tabCls(filter === "used")}>{t("admin-invites.used", "Usados")} ({usedCount})</button>
          <button onClick={() => setFilter("expired")} className={tabCls(filter === "expired")}>{t("admin-invites.expired", "Caducados")} ({expiredCount})</button>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-invites.no-codes", "No hay códigos que mostrar.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("mi-cuenta.email", "Email")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-invites.code", "Código")}</th>
                  <th className="px-4 py-3 font-semibold">{t("mi-cuenta.status", "Estado")}</th>
                  <th className="px-4 py-3 font-semibold">{t("mi-cuenta.plan", "Plan")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-invites.language", "Idioma")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-invites.created", "Creado")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-invites.used-col", "Usado")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-invites.actions", "Acciones")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white/90">{c.email}</td>
                    <td className="px-4 py-3 font-mono font-semibold tracking-wide text-neon-cyan">{c.code}</td>
                    <td className="px-4 py-3">
                      {statusOf(c) === "activated" ? (
                        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-neon-cyan">
                          {t("admin-invites.used-col", "Usado")}
                        </span>
                      ) : statusOf(c) === "expired" ? (
                        <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                          {t("admin-invites.expired-single", "Caducado")}
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                          {t("admin-invites.pending-single", "Pendiente")}
                        </span>
                      )}
                      {/* Pendientes con caducidad: hasta cuándo y cuántos recordatorios llevan. */}
                      {statusOf(c) === "pending" && c.expiresAtUtc && (
                        <p className="mt-1 whitespace-nowrap text-[11px] text-white/45">
                          {t("admin-invites.expires-on", "Caduca: {date}", { date: fmt(c.expiresAtUtc, lang) })}
                          {c.remindersSent > 0 && ` · ${t("admin-invites.reminders-sent", "{count} recordatorio(s)", { count: c.remindersSent })}`}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PLAN_CLS[c.planType]}`}>
                        {PLAN_LABEL[c.planType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/60 uppercase">{c.language}</td>
                    <td className="px-4 py-3 text-white/60">{fmt(c.createdAtUtc, lang)}</td>
                    <td className="px-4 py-3 text-white/60">{fmt(c.usedAtUtc, lang)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copy(c.link)}
                          className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
                        >
                          {copied === c.link ? <Check className="h-3.5 w-3.5 text-neon-cyan" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied === c.link ? t("clip.copied-short", "Copiado") : t("admin-invites.link", "Link")}
                        </button>
                        {statusOf(c) === "expired" && (
                          <button
                            onClick={() => reinvite(c)}
                            disabled={invitingEmail === c.email}
                            className="flex items-center gap-1.5 whitespace-nowrap text-xs text-neon-cyan/80 transition hover:text-neon-cyan disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            {t("admin-invites.reinvite", "Volver a invitar")}
                          </button>
                        )}
                        <button
                          onClick={() => remove(c)}
                          className="flex items-center gap-1.5 text-xs text-white/50 transition hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("common.delete", "Eliminar")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminInvites
