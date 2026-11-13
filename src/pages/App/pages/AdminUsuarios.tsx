import { useEffect, useRef, useState, type ReactNode } from "react"
import { ExternalLink, Gift, Monitor, Percent, Search, Smartphone, Star, Tablet, Trash2, UserPlus, Users, X } from "lucide-react"
import { getAdminUsers, giftMonth, type AdminUser, type AdminUsersPage, type AdminUserStatus } from "../../../lib/api/adminUsers"
import { adminDeleteUser } from "../../../lib/api/profile"
import { useI18n } from "../../../lib/i18n/store"
import AdminInviteDialog from "../components/admin/AdminInviteDialog"
import AdminDiscountCodesDialog from "../components/admin/AdminDiscountCodesDialog"

/**
 * Panel → Usuarios (10/11/2026): sustituye a «Invitaciones». Con el registro abierto, la mayoría
 * de cuentas entran por Precios sin invitación y no salían en ningún sitio del panel.
 * Todas las cuentas, con su estado en claro, cómo llegaron, su origen y su uso; buscador,
 * filtros y la ficha de cada persona (desde la que se puede borrar la cuenta). «Invitar usuario»
 * abre una ventana para invitar al plan gratis. Los números agregados siguen en Métricas.
 */

const STATUS_ORDER: AdminUserStatus[] = ["trial", "paying", "free", "canceling", "past_due", "incomplete", "no_access"]

const STATUS_STYLE: Record<AdminUserStatus, string> = {
  trial: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
  paying: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  free: "border-violet-400/40 bg-violet-400/10 text-violet-300",
  canceling: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  past_due: "border-red-400/40 bg-red-400/10 text-red-300",
  incomplete: "border-orange-400/40 bg-orange-400/10 text-orange-300",
  no_access: "border-white/15 bg-white/5 text-white/50",
}

const PLAN_NAME: Record<string, string> = { Starter: "Essential", Club: "Club", Coach: "Coach" }

// Cuentas por bloque: la API las devuelve de 25 en 25 y «Cargar más» pide las siguientes.
const PAGE_SIZE = 25

const AdminUsuarios = () => {
  const { t } = useI18n()
  const [inviting, setInviting] = useState(false)
  const [codesOpen, setCodesOpen] = useState(false)

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{t("admin-users.title", "Usuarios")}</h1>
            <p className="text-sm text-white/60">{t("admin-users.subtitle-all", "Todas las cuentas de la plataforma.")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCodesOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/85 transition hover:border-white/30 hover:text-white"
          >
            <Percent className="h-4 w-4" />
            {t("admin-users.discount-codes", "Códigos de descuento")}
          </button>
          <button
            type="button"
            onClick={() => setInviting(true)}
            className="flex items-center gap-2 rounded-lg bg-neon-cyan px-4 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" />
            {t("admin-users.invite", "Invitar usuario")}
          </button>
        </div>
      </div>

      <UsersList />
      {inviting && <AdminInviteDialog onClose={() => setInviting(false)} />}
      {codesOpen && <AdminDiscountCodesDialog onClose={() => setCodesOpen(false)} />}
    </main>
  )
}

const UsersList = () => {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [status, setStatus] = useState<AdminUserStatus | "all">("all")
  const [plan, setPlan] = useState("all")
  const [hideTeam, setHideTeam] = useState(true)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Lo cargado hasta ahora (bloques de 25) y los totales que manda la API con los filtros.
  const [page, setPage] = useState<AdminUsersPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Solo cuenta la última petición: si cambian los filtros a mitad, la anterior se descarta.
  const requestId = useRef(0)

  // El buscador espera a que se deje de escribir antes de pedir.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(id)
  }, [query])

  const fetchPage = (skip: number) => getAdminUsers({ skip, take: PAGE_SIZE, q: debouncedQuery, status, plan, hideTeam })

  // Filtros nuevos (o tras borrar una cuenta): se vuelve a empezar por el primer bloque.
  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    fetchPage(0)
      .then((res) => {
        if (id === requestId.current) setPage(res)
      })
      .catch((err) => {
        if (id === requestId.current) setError(err instanceof Error ? err.message : t("admin-users.error", "No se pudieron cargar las cuentas."))
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, plan, hideTeam, reloadKey])

  const loadMore = async () => {
    if (!page || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      const res = await fetchPage(page.items.length)
      if (id !== requestId.current) return
      setPage((prev) => (prev ? { ...res, items: [...prev.items, ...res.items.filter((u) => !prev.items.some((x) => x.id === u.id))] } : res))
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : t("admin-users.error", "No se pudieron cargar las cuentas."))
    } finally {
      setLoadingMore(false)
    }
  }
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Mes gratis (compensación): resultado del último, en la ficha.
  const [gifting, setGifting] = useState(false)
  const [giftMessage, setGiftMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const openUser = (u: AdminUser | null) => {
    setDeleteError(null)
    setGiftMessage(null)
    setSelected(u)
  }

  const giveMonth = async (u: AdminUser) => {
    if (gifting) return
    const already = u.giftedMonths
      ? ` ${t("admin-users.gift-already", "Ya tiene {count} regalado(s).", { count: u.giftedMonths })}`
      : ""
    if (!window.confirm(t("admin-users.gift-confirm", "¿Regalar un mes a {email}? Su próxima factura saldrá a 0 € y después seguirá pagando normal.", { email: u.email }) + already)) return
    setGifting(true)
    setGiftMessage(null)
    try {
      await giftMonth(u.id)
      setGiftMessage({ ok: true, text: t("admin-users.gift-done", "Hecho: su próxima factura saldrá a 0 €.") })
      setSelected({ ...u, giftedMonths: (u.giftedMonths ?? 0) + 1 })
    } catch (err) {
      setGiftMessage({ ok: false, text: err instanceof Error ? err.message : t("admin-users.gift-error", "No se pudo regalar el mes.") })
    } finally {
      setGifting(false)
    }
  }

  const removeAccount = async (u: AdminUser) => {
    if (deleting) return
    if (!window.confirm(t("admin-delete-account.confirm", "Se borrará la cuenta de {email} y todos sus datos, y se cancelará su suscripción. No se puede deshacer. ¿Seguir?", { email: u.email }))) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await adminDeleteUser(u.email)
      setSelected(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("admin-delete-account.error", "No se pudo borrar la cuenta."))
    } finally {
      setDeleting(false)
    }
  }

  const locale = lang === "en" ? "en-GB" : "es-ES"
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" }) : "—")

  const statusLabel = (u: AdminUser) => {
    switch (u.status) {
      case "trial":
        return u.trialEndsAtUtc ? t("admin-users.status.trial-until", "Prueba hasta {date}", { date: date(u.trialEndsAtUtc) }) : t("admin-users.status.trial", "En prueba")
      case "paying":
        return t("admin-users.status.paying", "Pagando")
      case "free":
        return t("admin-users.status.free", "Gratis")
      case "canceling":
        return t("admin-users.status.canceling", "Cancela el {date}", { date: date(u.pendingChangeAtUtc ?? u.currentPeriodEndUtc) })
      case "past_due":
        return t("admin-users.status.past-due", "Pago pendiente")
      case "incomplete":
        return t("admin-users.status.incomplete", "Incompleta")
      default:
        return t("admin-users.status.no-access", "Sin acceso")
    }
  }
  const statusName: Record<AdminUserStatus, string> = {
    trial: t("admin-users.filter.trial", "En prueba"),
    paying: t("admin-users.status.paying", "Pagando"),
    free: t("admin-users.status.free", "Gratis"),
    canceling: t("admin-users.filter.canceling", "Cancelando"),
    past_due: t("admin-users.status.past-due", "Pago pendiente"),
    incomplete: t("admin-users.status.incomplete", "Incompleta"),
    no_access: t("admin-users.status.no-access", "Sin acceso"),
  }
  const arrivedLabel = (u: AdminUser) =>
    u.arrivedBy === "pricing"
      ? t("admin-users.arrived.pricing", "Precios")
      : u.arrivedBy === "waitlist"
        ? t("admin-users.arrived.waitlist", "Lista de espera")
        : t("admin-users.arrived.invite", "Invitación")
  const lastActive = (iso: string | null) => {
    if (!iso) return "—"
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    return days <= 0 ? t("admin-users.today", "hoy") : days === 1 ? t("admin-users.yesterday", "ayer") : t("admin-users.days-ago", "hace {n} d", { n: days })
  }
  const country = (code: string | null) => {
    if (!code) return "—"
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code
    } catch {
      return code
    }
  }

  const rows = page?.items ?? []
  const counts = page?.counts ?? {}

  if (error && !page) return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
  if (loading && !page) return <p className="text-sm text-white/40">{t("common.loading", "Cargando...")}</p>

  const StatusChip = ({ u }: { u: AdminUser }) => (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[u.status]}`}>{statusLabel(u)}</span>
  )
  const DeviceIcon = ({ device }: { device: string | null }) => {
    const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : device === "desktop" ? Monitor : null
    return Icon ? <Icon className="h-4 w-4 text-white/60" aria-label={device ?? ""} /> : <span className="text-white/30">—</span>
  }

  return (
    <div>
      {/* Resumen por estado: cada uno filtra la lista. */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus("all")}
          className={`rounded-full border px-3 py-1.5 text-sm ${status === "all" ? "border-white/60 bg-white/10 text-white" : "border-white/15 text-white/60 hover:text-white"}`}
        >
          {t("admin-users.total", "Total")} <span className="font-bold">{page?.all ?? 0}</span>
        </button>
        {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(status === s ? "all" : s)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${status === s ? STATUS_STYLE[s] : "border-white/15 text-white/60 hover:text-white"}`}
          >
            {statusName[s]} <span className="font-bold">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Buscador y filtros */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin-users.search", "Buscar por nombre o email")}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-base text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none sm:text-sm"
          />
        </label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white sm:text-sm"
          aria-label={t("admin-users.plan", "Plan")}
        >
          <option value="all" className="bg-midnight">{t("admin-users.all-plans", "Todos los planes")}</option>
          {Object.entries(PLAN_NAME).map(([key, name]) => (
            <option key={key} value={key} className="bg-midnight">{name}</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={hideTeam} onChange={(e) => setHideTeam(e.target.checked)} className="h-4 w-4 accent-neon-cyan" />
          {t("admin-users.hide-team", "Ocultar cuentas del equipo")}
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          {loading ? t("common.loading", "Cargando...") : t("admin-users.empty", "No hay cuentas con estos filtros.")}
        </p>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* Ordenador: tabla */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.person", "Persona")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.created", "Alta")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.plan", "Plan")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.status", "Estado")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.arrived", "Llegó por")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.country", "País")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.device", "Disp.")}</th>
                  <th className="px-4 py-3 font-semibold">{t("admin-users.col.last-active", "Última act.")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((u) => (
                  <tr key={u.id} onClick={() => openUser(u)} className="cursor-pointer transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{u.displayName || "—"}</p>
                      <p className="text-xs text-white/50">{u.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">{date(u.createdAtUtc)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-white">
                      {PLAN_NAME[u.tier] ?? u.tier}
                      {u.founderPrice && <Star className="ml-1 inline h-3.5 w-3.5 text-amber-300" fill="currentColor" aria-label={t("admin-users.founder", "Precio fundador")} />}
                    </td>
                    <td className="px-4 py-3"><StatusChip u={u} /></td>
                    <td className="px-4 py-3 text-white/70">
                      {arrivedLabel(u)}
                      {u.origin && <span className="block text-xs text-white/40">{u.origin}</span>}
                      {u.discountCode && <span className="block font-mono text-xs text-neon-lime/80">{u.discountCode}</span>}
                    </td>
                    <td className="px-4 py-3 text-white/70">{country(u.country)}</td>
                    <td className="px-4 py-3"><DeviceIcon device={u.device} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/70">{lastActive(u.lastActiveAtUtc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="space-y-3 lg:hidden">
            {rows.map((u) => (
              <li key={u.id}>
                <button type="button" onClick={() => openUser(u)} className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{u.displayName || u.email}</p>
                      <p className="truncate text-xs text-white/50">{u.email}</p>
                    </div>
                    <StatusChip u={u} />
                  </div>
                  <p className="mt-2 text-xs text-white/50">
                    {PLAN_NAME[u.tier] ?? u.tier}
                    {u.founderPrice && " ★"} · {arrivedLabel(u)} · {t("admin-users.created-on", "alta {date}", { date: date(u.createdAtUtc) })} ·{" "}
                    {lastActive(u.lastActiveAtUtc)}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {/* Más cuentas: el siguiente bloque de 25, debajo de las que ya hay. */}
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-xs text-white/40">
              {t("admin-users.showing", "Mostrando {shown} de {total}", { shown: rows.length, total: page?.total ?? rows.length })}
            </p>
            {page && rows.length < page.total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore || loading}
                className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                {loadingMore ? t("common.loading", "Cargando...") : t("admin-users.load-more", "Cargar más")}
              </button>
            )}
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>
        </div>
      )}

      {/* Ficha de la persona */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center" role="dialog" aria-modal="true" onClick={() => openUser(null)}>
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-midnight p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-bold text-white">{selected.displayName || selected.email}</h2>
                <p className="truncate text-sm text-white/50">{selected.email}</p>
              </div>
              <button type="button" onClick={() => openUser(null)} className="text-white/50 hover:text-white" aria-label={t("common.close", "Cerrar")}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {(
                [
                [t("admin-users.col.status", "Estado"), <StatusChip key="s" u={selected} />],
                [t("admin-users.plan", "Plan"), `${PLAN_NAME[selected.tier] ?? selected.tier}${selected.founderPrice ? ` · ${t("admin-users.founder", "Precio fundador")}` : ""}`],
                selected.pendingTier && [t("admin-users.pending-change", "Cambio pedido"), `${PLAN_NAME[selected.pendingTier] ?? selected.pendingTier} · ${date(selected.pendingChangeAtUtc)}`],
                [t("admin-users.col.created", "Alta"), new Date(selected.createdAtUtc).toLocaleString(locale)],
                selected.trialEndsAtUtc && [t("admin-users.trial-ends", "Fin de la prueba"), date(selected.trialEndsAtUtc)],
                selected.currentPeriodEndUtc && [t("admin-users.next-charge", "Fin del periodo / próximo cobro"), date(selected.currentPeriodEndUtc)],
                [t("admin-users.col.last-active", "Última act."), lastActive(selected.lastActiveAtUtc)],
                [t("admin-users.minutes", "Minutos vistos"), String(selected.minutes)],
                [t("admin-users.surveys", "Encuestas"), selected.surveys.length ? selected.surveys.join(", ") : "—"],
                [t("admin-users.rating", "Valoración"), selected.rating ? `${"★".repeat(selected.rating)}${"☆".repeat(5 - selected.rating)}` : "—"],
                [t("admin-users.col.arrived", "Llegó por"), arrivedLabel(selected)],
                selected.discountCode && [t("admin-users.discount-code", "Código de descuento"), <span key="dc" className="font-mono">{selected.discountCode}</span>],
                !!selected.giftedMonths && [t("admin-users.gifted-months", "Meses regalados"), String(selected.giftedMonths)],
                [t("admin-users.origin", "Origen"), [selected.origin, selected.utmMedium, selected.utmCampaign].filter(Boolean).join(" · ") || t("admin-users.direct", "Directo")],
                [t("admin-users.col.country", "País"), country(selected.country)],
                [t("admin-users.col.device", "Disp."), selected.device ?? "—"],
                [t("admin-users.language", "Idioma"), selected.language === "en" ? "English" : "Español"],
                ] as Array<[string, ReactNode] | null | false | "">
              )
                .filter((row): row is [string, ReactNode] => Array.isArray(row))
                .map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-white/40">{label}</dt>
                    <dd className="text-white">{value}</dd>
                  </div>
                ))}
            </dl>
            {selected.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${selected.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-neon-cyan hover:underline"
              >
                {t("admin-users.open-stripe", "Ver en Stripe")} <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {/* Mes gratis: solo con una suscripción en marcha (hay una próxima factura que regalar). */}
            {selected.stripeCustomerId && ["trial", "paying", "canceling", "past_due"].includes(selected.status) && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => giveMonth(selected)}
                  disabled={gifting}
                  className="flex items-center gap-1.5 text-sm font-semibold text-neon-cyan transition hover:brightness-110 disabled:opacity-50"
                >
                  <Gift className="h-4 w-4" />
                  {gifting ? t("admin-users.gift-busy", "Aplicando…") : t("admin-users.gift-cta", "Regalar un mes")}
                </button>
                <p className="mt-1 text-xs text-white/40">
                  {t("admin-users.gift-help", "Para compensar a alguien: su próxima factura sale a 0 €. No cambia su plan ni su estado.")}
                </p>
                {giftMessage && <p className={`mt-2 text-xs ${giftMessage.ok ? "text-neon-cyan" : "text-red-300"}`}>{giftMessage.text}</p>}
              </div>
            )}
            <div className="mt-6 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => removeAccount(selected)}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-300/80 transition hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? t("admin-delete-account.busy", "Eliminando…") : t("admin-delete-account.cta", "Eliminar cuenta")}
              </button>
              <p className="mt-1 text-xs text-white/40">
                {t("admin-delete-account.help", "Para peticiones de borrado. Cancela su suscripción, borra sus datos y libera su email.")}
              </p>
              {deleteError && <p className="mt-2 text-xs text-red-300">{deleteError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsuarios
