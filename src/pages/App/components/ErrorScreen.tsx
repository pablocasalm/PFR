import { useI18n } from "../../../lib/i18n/store"

/** Mensaje de error simple: solo el código HTTP, sin especular sobre la causa. Sin `status`
 * (fallo de red, sin respuesta del backend) muestra "Error" a secas. */
const ErrorScreen = ({ status, className = "text-sm text-red-400/80" }: { status?: number | null; className?: string }) => {
  const { t } = useI18n()
  return (
    <p className={className}>
      {status != null ? t("common.error-code", "Error {status}", { status: String(status) }) : t("common.error", "Error")}
    </p>
  )
}

export default ErrorScreen
