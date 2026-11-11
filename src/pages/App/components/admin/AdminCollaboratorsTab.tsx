import { useState } from "react"
import { Pencil, Plus } from "lucide-react"
import {
  createCollaborator,
  updateCollaborator,
  type AdminCollaborator,
  type AdminDiscountCode,
  type Collaborator,
  type CollaboratorType,
} from "../../../../lib/api/adminUsers"
import { useI18n } from "../../../../lib/i18n/store"

/**
 * Pestaña «Colaboradores» de Códigos de descuento (11/11/2026): personas, empresas, medios… a los
 * que se da un código. Cada uno con sus códigos y lo que suman entre todos: usos en Stripe y
 * personas que se han suscrito. Se crean y se editan aquí (también al crear un código).
 */

export const COLLABORATOR_TYPES: { key: CollaboratorType; label: string }[] = [
  { key: "person", label: "Persona" },
  { key: "company", label: "Empresa" },
  { key: "media", label: "Medio" },
  { key: "club", label: "Club" },
  { key: "other", label: "Otro" },
]

type Form = { name: string; type: CollaboratorType; link: string; email: string; notes: string; userEmail: string }
const EMPTY: Form = { name: "", type: "person", link: "", email: "", notes: "", userEmail: "" }

const AdminCollaboratorsTab = ({
  collaborators,
  codes,
  onChanged,
}: {
  collaborators: AdminCollaborator[] | null
  codes: AdminDiscountCode[]
  onChanged: () => Promise<unknown>
}) => {
  const { t } = useI18n()
  // Formulario abierto: null cerrado, "new" para uno nuevo, o el colaborador que se edita.
  const [editing, setEditing] = useState<Collaborator | "new" | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const open = (c: Collaborator | "new") => {
    setEditing(c)
    setMessage(null)
    setForm(
      c === "new"
        ? EMPTY
        : { name: c.name, type: c.type, link: c.link ?? "", email: c.email ?? "", notes: c.notes ?? "", userEmail: c.userEmail ?? "" },
    )
  }

  const save = async () => {
    if (!editing || saving) return
    setSaving(true)
    setMessage(null)
    try {
      const body = { ...form, name: form.name.trim() }
      if (editing === "new") await createCollaborator(body)
      else await updateCollaborator(editing.id, body)
      await onChanged()
      setEditing(null)
      setMessage({ ok: true, text: t("admin-collaborators.saved", "Colaborador guardado.") })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-codes.error-save", "No se pudo guardar.") })
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (type: CollaboratorType) => {
    const found = COLLABORATOR_TYPES.find((x) => x.key === type)
    return found ? t(`admin-collaborators.type.${type}`, found.label) : type
  }
  const field = "block h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div>
      {editing ? (
        <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/[0.04] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/60">
              {t("admin-collaborators.name", "Nombre")}
              <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="Andrea Pérez, La Vanguardia…" className={`${field} mt-1`} />
            </label>
            <label className="block text-xs text-white/60">
              {t("admin-collaborators.type", "Tipo")}
              <select value={form.type} onChange={(e) => set("type", e.target.value as CollaboratorType)} className={`${field} mt-1`}>
                {COLLABORATOR_TYPES.map((x) => (
                  <option key={x.key} value={x.key} className="bg-midnight">{typeLabel(x.key)}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-white/60">
              {t("admin-collaborators.link", "Enlace (web, perfil o red social)")}
              <input value={form.link} onChange={(e) => set("link", e.target.value)} maxLength={300} placeholder="@andreapadel, lavanguardia.com…" className={`${field} mt-1`} />
            </label>
            <label className="block text-xs text-white/60">
              {t("admin-collaborators.email", "Email de contacto")}
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={320} className={`${field} mt-1`} />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              {t("admin-collaborators.user-email", "Su cuenta en PFR (email, opcional)")}
              <input type="email" value={form.userEmail} onChange={(e) => set("userEmail", e.target.value)} maxLength={320} className={`${field} mt-1`} />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              {t("admin-collaborators.notes", "Notas")}
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t("admin-collaborators.notes-placeholder", "Lo acordado, fechas de publicación…")}
                className="mt-1 block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white">
              {t("common.cancel", "Cancelar")}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={form.name.trim().length < 2 || saving}
              className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? t("common.saving", "Guardando...") : t("admin-collaborators.save", "Guardar")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => open("new")}
          className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          {t("admin-collaborators.new", "Nuevo colaborador")}
        </button>
      )}

      {message && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-neon-cyan/10 text-neon-cyan" : "bg-red-500/10 text-red-300"}`}>{message.text}</p>
      )}

      <div className="mt-5">
        {collaborators === null ? (
          <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
        ) : collaborators.length === 0 ? (
          <p className="text-sm text-white/40">{t("admin-collaborators.empty", "Todavía no hay ningún colaborador.")}</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
            {collaborators.map(({ collaborator: c, users }) => {
              const own = codes.filter((x) => x.code.collaboratorId === c.id)
              const uses = own.reduce((sum, x) => sum + x.code.timesRedeemed, 0)
              return (
                <li key={c.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">{c.name}</span>
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/50">{typeLabel(c.type)}</span>
                    </p>
                    {(c.link || c.email || c.userEmail) && (
                      <p className="mt-0.5 truncate text-xs text-white/45">{[c.link, c.email, c.userEmail && `PFR: ${c.userEmail}`].filter(Boolean).join(" · ")}</p>
                    )}
                    <p className="mt-1 text-xs text-white/60">
                      {own.length > 0 ? (
                        <>
                          <span className="font-mono">{own.map((x) => x.code.code).join(", ")}</span>
                          {` · ${t("admin-collaborators.uses", "{uses} usos · {users} suscritos", { uses, users })}`}
                        </>
                      ) : (
                        t("admin-collaborators.no-codes", "Sin códigos todavía")
                      )}
                    </p>
                    {c.notes && <p className="mt-1 whitespace-pre-line text-xs text-white/40">{c.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => open(c)}
                    aria-label={t("admin-collaborators.edit", "Editar {name}", { name: c.name })}
                    className="shrink-0 rounded-md p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default AdminCollaboratorsTab
