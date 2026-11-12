import { useEffect, useState } from "react"
import { ChevronDown, Copy, Link2, MoreHorizontal, Pencil, Plus, Power, Users, X } from "lucide-react"
import {
  createCollaborator,
  createDiscountCode,
  getCollaborators,
  getDiscountCodeUsers,
  getDiscountCodes,
  replaceDiscountCode,
  setDiscountCodeActive,
  type AdminCollaborator,
  type AdminDiscountCode,
  type CollaboratorType,
  type CreateDiscountCode,
  type DiscountCodeUser,
} from "../../../../lib/api/adminUsers"
import { describeDiscount, normalizeDiscountCode } from "../../../../lib/discountCode"
import { PLAN_NAME, type PlanTier } from "../../../../lib/auth/store"
import { useI18n } from "../../../../lib/i18n/store"
import AdminCollaboratorsTab, { COLLABORATOR_TYPES } from "./AdminCollaboratorsTab"

/**
 * «Códigos de descuento» (Panel → Usuarios, 11/11/2026, tarjeta #46): crear, ver y desactivar los
 * códigos (viven en Stripe: cupón + código de promoción) y quién se ha suscrito con cada uno. El
 * mismo código vale en la casilla al crear la cuenta, en el enlace con `?codigo=` y en el campo del
 * pago de Stripe. «Editar» sustituye el código por otro con el mismo texto (Stripe no deja cambiarlo):
 * quien ya lo usó conserva su descuento y el historial sigue entero. Pestaña «Colaboradores»: de quién
 * es cada código (AdminCollaboratorsTab); al crear un código se elige de la lista o se añade ahí mismo.
 */

// Enlace para compartir: la página de Precios de la landing, que pasa el código a la app.
const SHARE_URL = "https://padelfilmroom.com/precios?codigo="
const TIERS: PlanTier[] = ["Starter", "Club", "Coach"]

type Duration = "first" | "months" | "forever"

const AdminDiscountCodesDialog = ({ onClose }: { onClose: () => void }) => {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState<"codes" | "collaborators">("codes")
  const [codes, setCodes] = useState<AdminDiscountCode[] | null>(null)
  const [collaborators, setCollaborators] = useState<AdminCollaborator[] | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // Formulario abierto: para un código nuevo o para editar uno (`editing`, con el texto fijo).
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminDiscountCode | null>(null)
  const [menu, setMenu] = useState<{ item: AdminDiscountCode; top: number; right: number } | null>(null)
  const [openUsers, setOpenUsers] = useState<string | null>(null)
  const [users, setUsers] = useState<Record<string, DiscountCodeUser[]>>({})

  // Formulario de código nuevo.
  const [code, setCode] = useState("")
  const [percent, setPercent] = useState("20")
  const [duration, setDuration] = useState<Duration>("first")
  const [months, setMonths] = useState("3")
  const [tiers, setTiers] = useState<PlanTier[]>(["Starter", "Club"])
  const [firstTimeOnly, setFirstTimeOnly] = useState(true)
  const [maxUses, setMaxUses] = useState("")
  const [expires, setExpires] = useState("")
  // Colaborador del código: "" ninguno, "new" para añadir uno ahí mismo, o su Id.
  const [collaboratorId, setCollaboratorId] = useState("")
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<CollaboratorType>("person")
  const [addingCollaborator, setAddingCollaborator] = useState(false)
  const [saving, setSaving] = useState(false)

  const openNew = () => {
    setEditing(null)
    setCode("")
    setPercent("20")
    setDuration("first")
    setMonths("3")
    setTiers(["Starter", "Club"])
    setFirstTimeOnly(true)
    setMaxUses("")
    setExpires("")
    setCollaboratorId("")
    setCreating(true)
  }

  // Editar: el formulario con su configuración. El límite de usos que se propone es el que le queda.
  const openEdit = (item: AdminDiscountCode) => {
    const c = item.code
    setEditing(item)
    setCode(c.code)
    setPercent(String(c.percentOff ?? 20))
    setDuration(c.duration === "forever" ? "forever" : c.durationInMonths && c.durationInMonths > 1 ? "months" : "first")
    setMonths(String(c.durationInMonths && c.durationInMonths > 1 ? c.durationInMonths : 3))
    setTiers(c.tiers)
    setFirstTimeOnly(c.firstTimeOnly)
    setMaxUses(c.maxRedemptions ? String(Math.max(1, c.maxRedemptions - (c.ownTimesRedeemed ?? c.timesRedeemed))) : "")
    setExpires(c.expiresAtUtc ? c.expiresAtUtc.slice(0, 10) : "")
    setCollaboratorId(c.collaboratorId ? String(c.collaboratorId) : "")
    setMessage(null)
    setCreating(true)
  }

  const load = () =>
    getDiscountCodes()
      .then(setCodes)
      .catch((err) => setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-codes.error-load", "No se pudieron cargar los códigos.") }))

  const loadCollaborators = () => getCollaborators().then(setCollaborators).catch(() => setCollaborators([]))

  useEffect(() => {
    load()
    loadCollaborators()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // «+ Nuevo colaborador» desde el formulario del código: se crea y queda elegido.
  const addCollaborator = async () => {
    if (addingCollaborator || newName.trim().length < 2) return
    setAddingCollaborator(true)
    setMessage(null)
    try {
      const res = await createCollaborator({ name: newName.trim(), type: newType })
      await loadCollaborators()
      setCollaboratorId(String(res.id))
      setNewName("")
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-codes.error-save", "No se pudo guardar.") })
    } finally {
      setAddingCollaborator(false)
    }
  }

  // Con la ventana abierta, la página de detrás no se mueve (mismo patrón que SaveToSheet).
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // El menú «⋯» va con posición fija (la lista tiene su propio scroll): se cierra al desplazar.
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

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ ok: true, text: t("admin-codes.copied", "{what} copiado.", { what: label }) })
    } catch {
      setMessage({ ok: false, text: t("admin-codes.copy-error", "No se pudo copiar.") })
    }
  }

  const toggleUsers = async (item: AdminDiscountCode) => {
    const key = item.code.code
    if (openUsers === key) return setOpenUsers(null)
    setOpenUsers(key)
    if (users[key]) return
    try {
      const list = await getDiscountCodeUsers(key)
      setUsers((prev) => ({ ...prev, [key]: list }))
    } catch {
      setUsers((prev) => ({ ...prev, [key]: [] }))
    }
  }

  const toggleActive = async (item: AdminDiscountCode) => {
    const next = !item.code.active
    if (!next && !window.confirm(t("admin-codes.confirm-off", "¿Desactivar {code}? Ya no se podrá usar; quien ya lo tiene aplicado conserva su descuento.", { code: item.code.code }))) return
    try {
      const res = await setDiscountCodeActive(item.code.id, next)
      setCodes((prev) => (prev ?? []).map((c) => (c.code.id === item.code.id ? { ...c, code: res.code } : c)))
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-codes.error-save", "No se pudo guardar.") })
    }
  }

  const create = async () => {
    if (saving) return
    setSaving(true)
    setMessage(null)
    try {
      const body: CreateDiscountCode = {
        code: normalizeDiscountCode(code),
        percentOff: Number(percent),
        // «Primer mes» es 1 mes desde que se aplica: con la prueba de 7 días cubre el primer cobro.
        duration: duration === "forever" ? "forever" : "repeating",
        durationInMonths: duration === "first" ? 1 : duration === "months" ? Number(months) : null,
        tiers,
        firstTimeOnly,
        maxRedemptions: maxUses ? Number(maxUses) : null,
        expiresAtUtc: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
        collaboratorId: collaboratorId && collaboratorId !== "new" ? Number(collaboratorId) : null,
      }
      if (editing) {
        const res = await replaceDiscountCode(editing.code.id, body)
        setCodes((prev) => (prev ?? []).map((c) => (c.code.id === editing.code.id ? res : c)))
        setMessage({ ok: true, text: t("admin-codes.edited", "Código {code} actualizado. Quien ya lo usó conserva su descuento.", { code: res.code.code }) })
      } else {
        const res = await createDiscountCode(body)
        setCodes((prev) => [res, ...(prev ?? [])])
        setMessage({ ok: true, text: t("admin-codes.created", "Código {code} creado. Ya se puede usar.", { code: res.code.code }) })
      }
      setCreating(false)
      setEditing(null)
      setCode("")
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-codes.error-save", "No se pudo guardar.") })
    } finally {
      setSaving(false)
    }
  }

  const locale = lang === "en" ? "en-GB" : "es-ES"
  const day = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })
  const tierNames = (list: PlanTier[]) => (list.length === 3 ? t("admin-codes.all-plans", "todos los planes") : list.map((x) => PLAN_NAME[x]).join(", "))
  const field = "block h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none sm:text-sm"
  const canCreate = collaboratorId !== "new" && normalizeDiscountCode(code).length >= 3 && Number(percent) > 0 && Number(percent) <= 100 && tiers.length > 0 && !saving

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-midnight p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">{t("admin-codes.title", "Códigos de descuento")}</h2>
            <p className="mt-1 text-sm text-white/60">
              {t("admin-codes.help", "Valen al crear la cuenta, en el enlace para compartir y en el pago de Stripe.")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label={t("common.close", "Cerrar")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex gap-1 border-b border-white/10" role="tablist">
          {(
            [
              ["codes", t("admin-codes.tab.codes", "Códigos")],
              ["collaborators", t("admin-codes.tab.collaborators", "Colaboradores")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition ${tab === key ? "border-neon-cyan text-white" : "border-transparent text-white/50 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin pr-1">
          {tab === "collaborators" ? (
            <AdminCollaboratorsTab collaborators={collaborators} codes={codes ?? []} onChanged={loadCollaborators} />
          ) : (
          <>
          {/* Código nuevo */}
          {creating ? (
            <div className="rounded-xl border border-neon-cyan/30 bg-neon-cyan/[0.04] p-4">
              {editing && (
                <p className="mb-3 text-xs text-white/60">
                  {t("admin-codes.edit-help", "Se guarda como un código nuevo con el mismo texto. Quien ya lo usó conserva su descuento y su historial no se pierde.")}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs text-white/60">
                  {t("admin-codes.code", "Código")}
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={!!editing}
                    placeholder="ANDREA20"
                    maxLength={32}
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`${field} mt-1 uppercase disabled:opacity-60`}
                  />
                </label>
                <label className="block text-xs text-white/60">
                  {t("admin-codes.collaborator", "Colaborador (opcional)")}
                  <select value={collaboratorId} onChange={(e) => setCollaboratorId(e.target.value)} className={`${field} mt-1`}>
                    <option value="" className="bg-midnight">{t("admin-codes.no-collaborator", "Ninguno")}</option>
                    {(collaborators ?? []).map(({ collaborator: c }) => (
                      <option key={c.id} value={String(c.id)} className="bg-midnight">{c.name}</option>
                    ))}
                    <option value="new" className="bg-midnight">{t("admin-codes.new-collaborator", "+ Nuevo colaborador")}</option>
                  </select>
                </label>
                {collaboratorId === "new" && (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:col-span-2">
                    <p className="text-xs text-white/60">{t("admin-codes.new-collaborator-help", "Nuevo colaborador. Después puedes completar sus datos en la pestaña Colaboradores.")}</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("admin-codes.collaborator-name", "Nombre (persona, empresa, medio…)")} maxLength={120} className={`${field} sm:flex-1`} />
                      <select value={newType} onChange={(e) => setNewType(e.target.value as CollaboratorType)} className={`${field} sm:w-36`}>
                        {COLLABORATOR_TYPES.map((x) => (
                          <option key={x.key} value={x.key} className="bg-midnight">{t(`admin-collaborators.type.${x.key}`, x.label)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addCollaborator}
                        disabled={newName.trim().length < 2 || addingCollaborator}
                        className="h-10 shrink-0 rounded-lg border border-neon-cyan/40 px-4 text-sm font-semibold text-neon-cyan transition hover:bg-neon-cyan/10 disabled:opacity-50"
                      >
                        {t("admin-codes.add", "Añadir")}
                      </button>
                    </div>
                  </div>
                )}
                <label className="block text-xs text-white/60">
                  {t("admin-codes.percent", "Descuento (%)")}
                  <input type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} className={`${field} mt-1`} />
                </label>
                {/* Duración y, con «Varios meses», cuántos, en la misma celda: así la rejilla no deja huecos. */}
                <div className="text-xs text-white/60">
                  <label htmlFor="code-duration">{t("admin-codes.duration", "Duración")}</label>
                  <div className="mt-1 flex gap-2">
                    <select id="code-duration" value={duration} onChange={(e) => setDuration(e.target.value as Duration)} className={`${field} min-w-0 flex-1`}>
                      <option value="first" className="bg-midnight">{t("admin-codes.duration.first", "El primer mes")}</option>
                      <option value="months" className="bg-midnight">{t("admin-codes.duration.months", "Varios meses")}</option>
                      <option value="forever" className="bg-midnight">{t("admin-codes.duration.forever", "Para siempre")}</option>
                    </select>
                    {duration === "months" && (
                      <input
                        type="number"
                        min={2}
                        max={36}
                        value={months}
                        onChange={(e) => setMonths(e.target.value)}
                        aria-label={t("admin-codes.months", "Meses")}
                        className={`${field.replace("w-full", "w-20")} shrink-0`}
                      />
                    )}
                  </div>
                </div>
                <label className="block text-xs text-white/60">
                  {t("admin-codes.max-uses", "Límite de usos (opcional)")}
                  <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder={t("admin-codes.unlimited", "Sin límite")} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs text-white/60">
                  {t("admin-codes.expires", "Caduca (opcional)")}
                  <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${field} mt-1`} />
                </label>
              </div>
              <p className="mt-3 text-xs text-white/60">{t("admin-codes.plans", "Planes")}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TIERS.map((tier) => {
                  const on = tiers.includes(tier)
                  return (
                    <button
                      key={tier}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTiers((prev) => (on ? prev.filter((x) => x !== tier) : [...prev, tier]))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/60 hover:text-white"}`}
                    >
                      {PLAN_NAME[tier].replace(/^PFR /, "")}
                    </button>
                  )
                })}
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-white/80">
                <input type="checkbox" checked={firstTimeOnly} onChange={(e) => setFirstTimeOnly(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
                {t("admin-codes.first-time", "Solo para quien nunca ha pagado")}
              </label>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setEditing(null)
                  }}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white"
                >
                  {t("common.cancel", "Cancelar")}
                </button>
                <button
                  type="button"
                  onClick={create}
                  disabled={!canCreate}
                  className="rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? t("common.saving", "Guardando...") : editing ? t("admin-codes.save", "Guardar cambios") : t("admin-codes.create", "Crear código")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2 text-sm font-bold text-midnight transition hover:brightness-110"
            >
              <Plus className="h-4 w-4" />
              {t("admin-codes.new", "Nuevo código")}
            </button>
          )}

          {message && (
            <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-neon-cyan/10 text-neon-cyan" : "bg-red-500/10 text-red-300"}`}>{message.text}</p>
          )}

          {/* Lista */}
          <div className="mt-5">
            {codes === null ? (
              <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>
            ) : codes.length === 0 ? (
              <p className="text-sm text-white/40">{t("admin-codes.empty", "Todavía no hay ningún código.")}</p>
            ) : (
              <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
                {codes.map((item) => {
                  const c = item.code
                  const key = c.code
                  return (
                    <li key={c.id} className={c.active ? "" : "opacity-50"}>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">{c.code}</span>
                            {c.collaborator && <span className="text-xs text-white/50">· {c.collaborator}</span>}
                            {!c.active && (
                              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/50">{t("admin-codes.inactive", "Desactivado")}</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-white/50">
                            {describeDiscount(c, t)} · {tierNames(c.tiers)}
                            {c.firstTimeOnly && ` · ${t("admin-codes.first-time-short", "solo cuentas nuevas")}`}
                            {c.expiresAtUtc && ` · ${t("admin-codes.until", "hasta el {date}", { date: day(c.expiresAtUtc) })}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleUsers(item)}
                          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
                          aria-expanded={openUsers === key}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {c.maxRedemptions ? `${c.timesRedeemed}/${c.maxRedemptions}` : c.timesRedeemed}
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openUsers === key ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect()
                            setMenu(menu?.item.code.id === c.id ? null : { item, top: r.bottom + 4, right: window.innerWidth - r.right })
                          }}
                          aria-haspopup="menu"
                          aria-label={t("admin-codes.actions", "Opciones de {code}", { code: c.code })}
                          className="shrink-0 rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                      {/* Quién se ha suscrito con este código */}
                      {openUsers === key && (
                        <div className="border-t border-white/5 bg-white/[0.02] px-3 py-2">
                          {!users[key] ? (
                            <p className="text-xs text-white/40">{t("common.loading", "Cargando...")}</p>
                          ) : users[key].length === 0 ? (
                            <p className="text-xs text-white/40">{t("admin-codes.no-users", "Nadie se ha suscrito todavía con este código.")}</p>
                          ) : (
                            <ul className="space-y-1">
                              {users[key].map((u) => (
                                <li key={`${u.userId}-${u.createdAtUtc}`} className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                                  <span className="min-w-0 truncate text-white/85">{u.displayName || u.email}</span>
                                  <span className="text-white/40">
                                    {PLAN_NAME[u.tier as PlanTier] ?? u.tier} · {day(u.createdAtUtc)} ·{" "}
                                    {u.source === "app" ? t("admin-codes.source.app", "desde la app") : t("admin-codes.source.checkout", "en el pago")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          </>
          )}
        </div>
      </div>

      {/* Menú «⋯»: una capa transparente lo cierra al pulsar fuera. */}
      {menu && (
        <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setMenu(null) }}>
          <div
            role="menu"
            style={{ top: menu.top, right: menu.right }}
            className="fixed w-52 overflow-hidden rounded-xl border border-white/10 bg-midnight-soft py-1 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { key: "link", icon: Link2, label: t("admin-codes.copy-link", "Copiar enlace"), run: () => copy(`${SHARE_URL}${encodeURIComponent(menu.item.code.code)}`, t("admin-codes.link", "Enlace")), cls: "text-white/85" },
              { key: "code", icon: Copy, label: t("admin-codes.copy-code", "Copiar código"), run: () => copy(menu.item.code.code, menu.item.code.code), cls: "text-white/85" },
              { key: "edit", icon: Pencil, label: t("admin-codes.edit", "Editar"), run: () => openEdit(menu.item), cls: "text-white/85" },
              {
                key: "active",
                icon: Power,
                label: menu.item.code.active ? t("admin-codes.deactivate", "Desactivar") : t("admin-codes.activate", "Activar"),
                run: () => toggleActive(menu.item),
                cls: menu.item.code.active ? "text-red-300" : "text-neon-cyan",
              },
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

export default AdminDiscountCodesDialog
