/** Configuración global del front. */

// URL base del backend PFR_API. Se sobrescribe con VITE_API_URL (env del build o .env).
// El fallback apunta a producción: así el despliegue funciona aunque falte la variable.
// Para backend local: pon VITE_API_URL=http://localhost:5196 en tu .env.
export const API_BASE = import.meta.env.VITE_API_URL ?? "https://api.padelfilmroom.com"
