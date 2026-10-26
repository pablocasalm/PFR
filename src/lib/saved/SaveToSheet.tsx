import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, FolderPlus, X } from "lucide-react"
import { useI18n } from "../i18n/store"
import { pickText } from "../i18n/content"
import { isSaved, toggleSavedItem, useSavedItems } from "./store"
import { createFolder, itemKey, setFoldersFor, useFolders } from "./folders"
import { closeSaveTo, subscribeSaveTo, getSaveTarget } from "./saveTo"

/**
 * «Guardar en…» (Mi Lista con carpetas): la abre el botón de guardar de cualquier tarjeta. Un
 * contenido puede estar en varias carpetas a la vez. Cada casilla se guarda al momento (si se
 * cierra sin pulsar «Hecho», no se pierde nada). «Mi Lista» sale siempre marcada y en gris, sin
 * poder desmarcarse (reporte #92: desmarcarla quitaba el contenido de todo y cerraba la ventana,
 * y parecía un fallo); para quitarlo de Mi Lista se hace desde la pantalla de Mi Lista. En móvil
 * sale desde abajo; en escritorio, centrada.
 */

const MAX_NAME = 60

const Box = ({ on }: { on: boolean }) => (
  <span
    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? "border-neon-cyan bg-neon-cyan text-midnight" : "border-white/30"}`}
  >
    {on && <Check className="h-4 w-4" strokeWidth={3} />}
  </span>
)

const SaveToSheet = () => {
  const item = useSyncExternalStore(subscribeSaveTo, getSaveTarget, getSaveTarget)
  useSavedItems() // re-render al guardar / quitar
  const folders = useFolders()
  const { t, lang } = useI18n()
  const [newName, setNewName] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSaveTo()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      setNewName(null)
      setError(null)
    }
  }, [item])

  if (!item) return null
  const key = itemKey(item)
  const saved = isSaved(item.id)
  const inFolders = folders.filter((f) => f.items.includes(key)).map((f) => f.id)

  const fail = () => setError(t("save-to.error", "No se pudo guardar. Inténtalo de nuevo."))

  // Solo para guardar (si por lo que sea no se había guardado): no se puede quitar desde aquí.
  const addToMyList = () => {
    if (!saved) toggleSavedItem(item)
  }

  const toggleFolder = (id: number) => {
    setError(null)
    const next = inFolders.includes(id) ? inFolders.filter((x) => x !== id) : [...inFolders, id]
    setFoldersFor(key, next).catch(fail)
  }

  const saveNewFolder = async () => {
    const name = (newName ?? "").trim()
    if (!name || busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await createFolder(name)
      await setFoldersFor(key, [...inFolders, created.id])
      setNewName(null)
    } catch {
      fail()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* Fondo más alto que la pantalla: en Safari de iPhone la página se ve bajo las barras. */}
      <div className="absolute inset-x-0 -inset-y-32 bg-black/60 backdrop-blur-sm" onClick={closeSaveTo} />
      <div className="relative flex max-h-[85vh] max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-white/10 bg-midnight motion-safe:animate-[sheet-up_.22s_ease-out] sm:max-w-md sm:rounded-2xl sm:border">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{t("save-to.title", "Guardar en…")}</h2>
            <p className="truncate text-xs text-white/50">{pickText(item.title, item.titleEn, lang)}</p>
          </div>
          <button onClick={closeSaveTo} aria-label={t("common.close", "Cerrar")} className="text-white/60 transition hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {saved ? (
            <div className="flex w-full cursor-default items-center justify-between border-b border-white/5 py-3.5 text-left text-sm text-white/45" aria-disabled="true">
              {t("save-to.my-list", "Mi Lista (Todo)")}
              <span className="opacity-60">
                <Box on />
              </span>
            </div>
          ) : (
            <button type="button" onClick={addToMyList} className="flex w-full items-center justify-between border-b border-white/5 py-3.5 text-left text-sm text-white">
              {t("save-to.my-list", "Mi Lista (Todo)")}
              <Box on={false} />
            </button>
          )}

          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFolder(f.id)}
              className="flex w-full items-center justify-between gap-3 border-b border-white/5 py-3.5 text-left text-sm text-white"
            >
              <span className="min-w-0 truncate">{f.name}</span>
              <Box on={inFolders.includes(f.id)} />
            </button>
          ))}

          {newName === null ? (
            <button type="button" onClick={() => setNewName("")} className="flex items-center gap-2 py-3.5 text-sm font-semibold text-neon-cyan">
              <FolderPlus className="h-4 w-4" /> {t("save-to.new-folder", "Nueva carpeta")}
            </button>
          ) : (
            <form
              className="flex items-center gap-2 py-3"
              onSubmit={(e) => {
                e.preventDefault()
                saveNewFolder()
              }}
            >
              <input
                autoFocus
                value={newName}
                maxLength={MAX_NAME}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("save-to.folder-name", "Nombre de la carpeta")}
                className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/30 sm:text-sm"
              />
              <button
                type="submit"
                disabled={!newName.trim() || busy}
                className="rounded-lg bg-neon-cyan px-3 py-2 text-sm font-bold text-midnight disabled:opacity-40"
              >
                {t("save-to.create", "Crear")}
              </button>
            </form>
          )}

          {error && <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

          <button
            type="button"
            onClick={closeSaveTo}
            className="mt-2 w-full rounded-xl bg-neon-cyan py-3 text-sm font-bold text-midnight transition hover:brightness-110"
          >
            {t("save-to.done", "Hecho")}
          </button>
          <p className="mt-2 text-center text-[11px] text-white/40">
            {t("save-to.help-v2", "Un contenido puede estar en varias carpetas. Para quitarlo de Mi Lista, hazlo desde la pantalla de Mi Lista.")}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SaveToSheet
