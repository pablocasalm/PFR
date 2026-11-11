import { useEffect, useState } from "react"
import { Copy, MoreHorizontal, RotateCw, Send, Trash2, X } from "lucide-react"
import { deleteInvite, generateInvites, listInvites, type InviteCode } from "../../../../lib/api/invites"
import { useI18n } from "../../../../lib/i18n/store"

/**
 * «Invitar usuario» (Panel → Usuarios, 10/11/2026): invita al plan gratis para siempre por email,
 * en lugar de la antigua pantalla de Invitaciones. Debajo, las invitaciones que aún no se han
 * usado (quien ya creó su cuenta sale en la lista de Usuarios), con su enlace y para borrarlas.
 */

type InviteLang = "es" | "en"

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

// Por si la API todavía no manda el estado: usado o pendiente.
const isUnused = (c: InviteCode) => (c.status ?? (c.used ? "activated" : "pending")) !== "activated"

const AdminInviteDialog = ({ onClose }: { onClose: () => void }) => {
  const { t, lang } = useI18n()
  const [raw, setRaw] = useState("")
  const [inviteLang, setInviteLang] = useState<InviteLang>("es")
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, setPending] = useState<InviteCode[] | null>(null)
  // Menú «⋯» abierto: la invitación y dónde pintarlo. Va con posición fija porque la lista
  // tiene su propio scroll y lo recortaría.
  const [menu, setMenu] = useState<{ invite: InviteCode; top: number; right: number } | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const emails = parseEmails(raw)

  const refresh = async () => {
    try {
      setPending((await listInvites()).filter(isUnused))
    } catch {
      setPending([])
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  // Con la ventana abierta, la página de detrás no se mueve (mismo patrón que SaveToSheet).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const submit = async () => {
    if (emails.length === 0 || sending) return
    setSending(true)
    setMessage(null)
    try {
      const res = await generateInvites(emails, inviteLang)
      setMessage({
        ok: true,
        text:
          res.length === 1
            ? t("admin-invite.sent-singular", "Invitación enviada a {email}.", { email: res[0].email })
            : t("admin-invite.sent-plural", "{count} invitaciones enviadas.", { count: res.length }),
      })
      setRaw("")
      await refresh()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-invite.error", "No se pudo enviar la invitación.") })
    } finally {
      setSending(false)
    }
  }

  const remove = async (c: InviteCode) => {
    if (!window.confirm(t("admin-invite.confirm-delete", "¿Borrar la invitación de {email}? El enlace dejará de funcionar.", { email: c.email }))) return
    try {
      await deleteInvite(c.id)
      setPending((prev) => (prev ?? []).filter((x) => x.id !== c.id))
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-invite.error-delete", "No se pudo borrar la invitación.") })
    }
  }

  // Se cierra el menú al desplazar la lista o redimensionar (su posición dejaría de cuadrar).
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener("resize", close)
    document.addEventListener("scroll", close, true)
    return () => {
      window.removeEventListener("resize", close)
      document.removeEventListener("scroll", close, true)
    }
  }, [menu])

  const openMenu = (c: InviteCode, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    setMenu(menu?.invite.id === c.id ? null : { invite: c, top: r.bottom + 4, right: window.innerWidth - r.right })
  }

  const copy = async (c: InviteCode) => {
    try {
      await navigator.clipboard.writeText(c.link)
      setMessage({ ok: true, text: t("admin-invite.copied", "Enlace de {email} copiado.", { email: c.email }) })
    } catch {
      setMessage({ ok: false, text: t("admin-invite.copy-error", "No se pudo copiar el enlace.") })
    }
  }

  // Volver a enviar: invitación nueva (otro código y otro email) y se borra la anterior, para
  // que no salgan dos. Sirve también para las caducadas.
  const resend = async (c: InviteCode) => {
    if (!window.confirm(t("admin-invite.confirm-resend", "¿Enviar una invitación nueva a {email}? El enlace anterior dejará de funcionar.", { email: c.email }))) return
    setBusyId(c.id)
    setMessage(null)
    try {
      await generateInvites([c.email], c.language === "en" ? "en" : "es")
      await deleteInvite(c.id)
      setMessage({ ok: true, text: t("admin-invite.sent-singular", "Invitación enviada a {email}.", { email: c.email }) })
      await refresh()
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-invite.error", "No se pudo enviar la invitación.") })
    } finally {
      setBusyId(null)
    }
  }

  const date = (iso: string) => new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short" })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-midnight p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">{t("admin-invite.title", "Invitar usuario")}</h2>
            <p className="mt-1 text-sm text-white/60">{t("admin-invite.help", "Les llega un email para crear su cuenta con el plan gratis para siempre.")}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label={t("common.close", "Cerrar")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={3}
          placeholder={t("admin-invite.placeholder", "Uno o varios emails, separados por comas o saltos de línea")}
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1" aria-label={t("admin-invite.language", "Idioma del email")}>
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setInviteLang(l)}
                aria-pressed={inviteLang === l}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${inviteLang === l ? "bg-neon-cyan text-midnight" : "text-white/60 hover:text-white"}`}
              >
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={emails.length === 0 || sending}
            className="flex items-center gap-2 rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending
              ? t("common.sending", "Enviando...")
              : emails.length > 1
                ? t("admin-invite.cta-plural", "Invitar ({count})", { count: emails.length })
                : t("admin-invite.cta", "Invitar")}
          </button>
        </div>

        {message && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-neon-cyan/10 text-neon-cyan" : "bg-red-500/10 text-red-300"}`}>{message.text}</p>
        )}

        {/* Invitaciones sin usar: quien ya creó su cuenta está en la lista de Usuarios. */}
        {pending && pending.length > 0 && (
          <div className="mt-5 flex min-h-0 flex-col">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
              {t("admin-invite.pending", "Sin usar todavía ({count})", { count: pending.length })}
            </p>
            <ul className="mt-2 max-h-48 min-h-0 divide-y divide-white/5 overflow-y-auto overscroll-contain scrollbar-thin rounded-lg border border-white/10">
              {pending.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <p className="min-w-0 truncate text-xs text-white/80">
                    {c.email}
                    <span className="text-white/35">
                      {" "}· {date(c.createdAtUtc)} · {c.language.toUpperCase()}
                      {c.status === "expired" && ` · ${t("admin-invite.expired", "caducada")}`}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={(e) => openMenu(c, e.currentTarget)}
                    disabled={busyId === c.id}
                    aria-haspopup="menu"
                    aria-expanded={menu?.invite.id === c.id}
                    aria-label={t("admin-invite.actions-aria", "Opciones de la invitación de {email}", { email: c.email })}
                    className={`shrink-0 rounded-md p-1 transition hover:bg-white/10 hover:text-white disabled:opacity-40 ${menu?.invite.id === c.id ? "bg-white/10 text-white" : "text-white/45"}`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Menú «⋯»: una capa transparente lo cierra al pulsar fuera. */}
      {menu && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setMenu(null) }}>
          <div
            role="menu"
            style={{ top: menu.top, right: menu.right }}
            className="fixed w-48 overflow-hidden rounded-xl border border-white/10 bg-midnight-soft py-1 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { key: "copy", icon: Copy, label: t("admin-invite.copy", "Copiar enlace"), run: () => copy(menu.invite), cls: "text-white/85" },
              { key: "resend", icon: RotateCw, label: t("admin-invite.resend", "Volver a enviar"), run: () => resend(menu.invite), cls: "text-white/85" },
              { key: "delete", icon: Trash2, label: t("admin-invite.delete", "Eliminar"), run: () => remove(menu.invite), cls: "text-red-300" },
            ].map(({ key, icon: Icon, label, run, cls }) => (
              <button
                key={key}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenu(null)
                  run()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-white/5 ${cls}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminInviteDialog
