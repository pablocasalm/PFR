import { useEffect, useState } from "react"
import { X, Plus } from "lucide-react"
import { lookup, type CatalogType } from "../../../lib/api/admin"

/**
 * Buscador genérico reutilizable (jugadores / sedes / categorías). El front manda el `type`
 * y muestra sugerencias del catálogo; si no hay coincidencia, ofrece "Crear «X»".
 * multi=true → varios valores (jugadores); multi=false → uno solo (sede, categoría).
 */

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-neon-cyan/50 focus:outline-none"

const CatalogPicker = ({
  type,
  multi = false,
  selected,
  onChange,
  placeholder,
  block,
}: {
  type: CatalogType
  multi?: boolean
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  block?: string // para type="concept": filtra sugerencias por bloque
}) => {
  const [q, setQ] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let active = true
    const t = setTimeout(async () => {
      try {
        const res = await lookup(type, q, block)
        if (active) setSuggestions(res)
      } catch {
        /* el backend puede no estar disponible: se ignora y solo se podrá crear */
      }
    }, 200)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [q, type, block])

  const add = (name: string) => {
    const value = name.trim()
    if (!value) return
    if (multi) {
      if (!selected.some((s) => s.toLowerCase() === value.toLowerCase())) onChange([...selected, value])
    } else {
      onChange([value])
    }
    setQ("")
    setOpen(false)
  }

  const remove = (name: string) => onChange(selected.filter((s) => s !== name))

  const filtered = suggestions.filter((s) => !selected.some((v) => v.toLowerCase() === s.toLowerCase()))
  const canCreate = q.trim().length > 0 && !suggestions.some((s) => s.toLowerCase() === q.trim().toLowerCase())

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s} className="flex items-center gap-1 rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2.5 py-1 text-xs text-neon-cyan">
              {s}
              <button type="button" onClick={() => remove(s)} className="text-neon-cyan/70 transition hover:text-neon-cyan">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {(multi || selected.length === 0) && (
        <>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={inputCls}
          />
          {open && (filtered.length > 0 || canCreate) && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-midnight shadow-2xl">
                {filtered.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => add(s)}
                    className="block w-full px-4 py-2 text-left text-sm text-white transition hover:bg-white/5"
                  >
                    {s}
                  </button>
                ))}
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => add(q)}
                    className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-2 text-left text-sm text-neon-cyan transition hover:bg-white/5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Crear «{q.trim()}»
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default CatalogPicker
