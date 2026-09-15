import { UploadCloud, Film } from "lucide-react"
import { useI18n } from "../../../lib/i18n/store"

/** Dropzone de archivo genérica (vídeo por defecto; también sirve para .vtt de subtítulos). */
const FileDrop = ({
  file,
  onFile,
  label,
  accept = "video/*",
  hint,
}: {
  file: File | null
  onFile: (f: File | null) => void
  label: string
  accept?: string
  hint?: string
}) => {
  const { t } = useI18n()
  return (
  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-8 text-center transition hover:border-neon-cyan/40">
    {file ? (
      <>
        <Film className="h-6 w-6 text-neon-cyan" />
        <span className="text-sm font-medium text-white">{file.name}</span>
        <span className="text-xs text-white/40">{(file.size / 1_000_000).toFixed(1)} MB</span>
      </>
    ) : (
      <>
        <UploadCloud className="h-6 w-6 text-white/50" />
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="text-xs text-white/40">{hint ?? t("file-drop.hint", "MP4, MOV…")}</span>
      </>
    )}
    <input type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
  </label>
  )
}

export default FileDrop
