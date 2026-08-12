import { useEffect, useMemo, useState } from "react"
import { Ticket, Copy, Check, Trash2 } from "lucide-react"
import { generateInvites, listInvites, deleteInvite, type InviteCode } from "../../../lib/api/invites"

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

const fmt = (iso: string | null): string => {
  if (!iso) return "—"
  // El backend envía las fechas en UTC pero a veces sin marca de zona ('Z'). Si no la trae,
  // la forzamos a UTC para que toLocaleString la convierta bien a la hora local (Madrid).
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  const d = new Date(hasTz ? iso : `${iso}Z`)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

type Filter = "all" | "pending" | "used"

const AdminInvites = () => {
  const [raw, setRaw] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")

  const emails = parseEmails(raw)
  const plural = emails.length === 1 ? "" : "s"

  const refresh = async () => {
    setLoading(true)
    try {
      setCodes(await listInvites())
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la lista.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const submit = async () => {
    if (emails.length === 0 || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const res = await generateInvites(emails)
      setNotice(`${res.length} invitación${res.length === 1 ? "" : "es"} generada${res.length === 1 ? "" : "s"} y enviada${res.length === 1 ? "" : "s"}.`)
      setRaw("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron generar las invitaciones.")
    } finally {
      setSending(false)
    }
  }

  const remove = async (c: InviteCode) => {
    if (!window.confirm(`¿Eliminar el código de ${c.email}?`)) return
    try {
      await deleteInvite(c.id)
      setCodes((prev) => prev.filter((x) => x.id !== c.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el código.")
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

  const usedCount = codes.filter((c) => c.used).length
  const pendingCount = codes.length - usedCount
  const filtered = useMemo(() => {
    if (filter === "pending") return codes.filter((c) => !c.used)
    if (filter === "used") return codes.filter((c) => c.used)
    return codes
  }, [codes, filter])

  const tabCls = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan" : "border-white/15 text-white/70 hover:text-white"
    }`

  return (
    <main className="w-full py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Ticket className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Invitaciones</h1>
          <p className="text-sm text-white/60">Genera, envía y gestiona los códigos de la beta.</p>
        </div>
      </div>

      {/* Generar */}
      <div className="max-w-2xl space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-white">Nuevos emails</label>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            placeholder="Pega los emails separados por comas, espacios o saltos de línea..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/40 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-white/50">
            {emails.length} email{plural} válido{plural} detectado{plural}.
          </p>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {notice && <p className="rounded-lg bg-neon-cyan/10 px-3 py-2 text-sm text-neon-cyan">{notice}</p>}

        <button
          onClick={submit}
          disabled={emails.length === 0 || sending}
          className="rounded-lg bg-neon-cyan px-5 py-2.5 text-sm font-bold text-midnight transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Enviando..." : `Generar y enviar (${emails.length})`}
        </button>
      </div>

      {/* Lista */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-bold uppercase tracking-wide text-white/70">Códigos</h2>
          <button onClick={() => setFilter("all")} className={tabCls(filter === "all")}>Todos ({codes.length})</button>
          <button onClick={() => setFilter("pending")} className={tabCls(filter === "pending")}>Pendientes ({pendingCount})</button>
          <button onClick={() => setFilter("used")} className={tabCls(filter === "used")}>Usados ({usedCount})</button>
        </div>

        {loading ? (
          <p className="text-sm text-white/40">Cargando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-white/40">No hay códigos que mostrar.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Creado</th>
                  <th className="px-4 py-3 font-semibold">Usado</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white/90">{c.email}</td>
                    <td className="px-4 py-3 font-mono font-semibold tracking-wide text-neon-cyan">{c.code}</td>
                    <td className="px-4 py-3">
                      {c.used ? (
                        <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-neon-cyan">Usado</span>
                      ) : (
                        <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{fmt(c.createdAtUtc)}</td>
                    <td className="px-4 py-3 text-white/60">{fmt(c.usedAtUtc)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => copy(c.link)}
                          className="flex items-center gap-1.5 text-xs text-white/60 transition hover:text-white"
                        >
                          {copied === c.link ? <Check className="h-3.5 w-3.5 text-neon-cyan" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied === c.link ? "Copiado" : "Link"}
                        </button>
                        <button
                          onClick={() => remove(c)}
                          className="flex items-center gap-1.5 text-xs text-white/50 transition hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
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
