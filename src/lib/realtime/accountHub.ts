import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr"
import { API_BASE } from "../config"
import { refreshAccessToken } from "../api/client"
import type { AuthUser } from "../auth/store"

/**
 * Canal en tiempo real con el backend (SignalR, hub /hubs/account — ver AccountHub.cs). El
 * servidor avisa por aquí cuando cambia algo de la cuenta que guardamos en local: hoy, el plan y
 * el estado de la suscripción (tras pagar, cambiar de plan, cancelar o fallar un cobro en
 * Stripe). Sin esto, la app seguía pintando el plan antiguo hasta que caducaba el token o se
 * volvía a iniciar sesión.
 *
 * El aviso trae ya los datos nuevos, así que no hace falta pedir nada. El servidor manda también
 * el estado actual cada vez que se conecta (y al reconectar tras un corte), de modo que tampoco
 * se pierde un cambio ocurrido con la app cerrada o sin red.
 *
 * Un solo canal para toda la app, con varios avisos (ver HubEvents). Quien quiera enterarse de
 * uno se apunta con `onHubEvent`, esté o no abierta la conexión en ese momento.
 */

/** Lo que trae el evento "accountChanged": mismos campos y valores que el login. */
export type AccountState = Pick<
  AuthUser,
  | "role"
  | "planType"
  | "planTier"
  | "trialEndsAtUtc"
  | "subscriptionStatus"
  | "subscriptionCurrentPeriodEndUtc"
  | "pendingPlanTier"
  | "pendingCancel"
  | "pendingChangeAtUtc"
  | "coachUnread"
>

/** Un mensaje del hilo de un análisis de Coach. */
export type CoachMessage = { id: number; requestId: number; fromStaff: boolean; authorUserId: number; authorName: string; text: string; createdAtUtc: string }

/** Avisos que manda el servidor y qué trae cada uno. */
export type HubEvents = {
  /** Ha cambiado la cuenta (plan, suscripción, mensajes sin leer). */
  accountChanged: AccountState
  /** Mensaje nuevo en el hilo de un análisis de Coach (al alumno, o a los admins). */
  coachMessage: CoachMessage
  /** El análisis del alumno ya está entregado. */
  analysisDelivered: { requestId: number }
  /** Se ha publicado una noticia. */
  newsPublished: Record<string, never>
}
const EVENT_NAMES: (keyof HubEvents)[] = ["accountChanged", "coachMessage", "analysisDelivered", "newsPublished"]

const handlers = new Map<string, Set<(payload: never) => void>>()

/** Se apunta a un aviso del servidor. Devuelve la función para dejar de escucharlo. */
export function onHubEvent<K extends keyof HubEvents>(event: K, handler: (payload: HubEvents[K]) => void): () => void {
  const set = handlers.get(event) ?? new Set()
  handlers.set(event, set)
  set.add(handler as (payload: never) => void)
  return () => {
    set.delete(handler as (payload: never) => void)
  }
}

let connection: HubConnection | null = null
let retryTimer: ReturnType<typeof setTimeout> | undefined

/** ¿Caduca el token en menos de un minuto? (Un token ilegible cuenta como caducado.) */
const isExpiring = (token: string) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number }
    return !payload.exp || payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

/** Token para abrir (o reabrir) la conexión: se renueva antes si está a punto de caducar. La
 * conexión se autentica solo al abrirse, así que una vez abierta sigue viva aunque caduque. */
const accessToken = async () => {
  let token = localStorage.getItem("token")
  if (!token || isExpiring(token)) {
    await refreshAccessToken()
    token = localStorage.getItem("token")
  }
  return token ?? ""
}

/** Id del usuario de la sesión, sacado del token (para distinguir mis mensajes de los de otros). */
export function currentUserId(): number | null {
  try {
    const token = localStorage.getItem("token") ?? ""
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string }
    return payload.sub ? Number(payload.sub) : null
  } catch {
    return null
  }
}

/** Abre el canal (si no lo está ya). Los avisos llegan a quien se haya apuntado con `onHubEvent`. */
export function startAccountHub() {
  if (connection) return

  const hub = new HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/account`, { accessTokenFactory: accessToken })
    // Si se cae, reintenta sin rendirse: 1 s, 2 s, 4 s… hasta un máximo de 30 s entre intentos.
    .withAutomaticReconnect({ nextRetryDelayInMilliseconds: (ctx) => Math.min(30_000, 1000 * 2 ** ctx.previousRetryCount) })
    .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.None)
    .build()
  for (const name of EVENT_NAMES) hub.on(name, (payload: never) => handlers.get(name)?.forEach((handler) => handler(payload)))
  connection = hub

  // La reconexión automática solo cubre una conexión que llegó a abrirse; el primer intento
  // (backend reiniciándose, sin red al abrir la app) se reintenta aquí.
  const connect = (attempt: number) => {
    hub.start().catch(() => {
      if (connection !== hub) return // se cerró mientras tanto
      retryTimer = setTimeout(() => connect(attempt + 1), Math.min(60_000, 2000 * 2 ** attempt))
    })
  }
  // En el siguiente ciclo, no ya: en desarrollo React monta, desmonta y vuelve a montar cada
  // componente, y así esa primera conexión de usar y tirar no llega ni a empezar.
  retryTimer = setTimeout(() => connect(0), 0)
}

/** Cierra el canal (al salir de la zona con sesión o cerrar sesión). */
export function stopAccountHub() {
  clearTimeout(retryTimer)
  const hub = connection
  connection = null
  hub?.stop().catch(() => {})
}
