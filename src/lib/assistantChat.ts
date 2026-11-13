import { useSyncExternalStore } from "react"
import { ApiError } from "./api/client"
import { sendAssistantMessage, sendAssistantSupport, type AssistantUsage } from "./api/assistant"
import type { ContentItem } from "./api/types"
import { watchHref } from "./format"

/**
 * Conversaciones del chat de PAFRI (fase 1, tarjeta #147): la de ahora y las anteriores de las últimas 24 h
 * (el historial del panel). Se copian en localStorage para que sobrevivan a cerrar el panel, ver
 * un clip recomendado y volver, y a las recargas (Safari del iPhone recarga la pestaña al volver de
 * otra app). Cada una dura KEEP_MS desde su último mensaje, y se borran al cerrar sesión o si entra
 * otra cuenta en el navegador. En el backend se guardan 12 meses para revisarlas nosotros.
 */
export type ChatMessage = {
  role: "user" | "assistant"
  text: string
  items?: ContentItem[]
  /** Duda de cuenta, pagos o incidencia: debajo sale el botón para enviar la conversación a Soporte. */
  support?: boolean
  /** Ya se envió a Soporte desde este mensaje. */
  supportSent?: boolean
}
export type ChatError = "limit" | "unavailable" | "other"
export type SavedChat = { conversationId: number; messages: ChatMessage[]; startedAt: string; updatedAt: string }

type State = {
  conversationId: number | null
  messages: ChatMessage[]
  startedAt: string | null
  updatedAt: string | null
  /** Las anteriores de las últimas 24 h, la más reciente primero. */
  history: SavedChat[]
  sending: boolean
  error: ChatError | null
  /** Lo último que devolvió el backend; null hasta el primer mensaje (el panel pide /usage al abrirse). */
  usage: AssistantUsage | null
}

const STORAGE_KEY = "pfr.assistant.chats"

/** Cuánto se guarda cada conversación desde su último mensaje. */
const KEEP_MS = 24 * 60 * 60 * 1000
const fresh = (updatedAt: string | null | undefined) => !!updatedAt && Date.now() - new Date(updatedAt).getTime() < KEEP_MS

type Stored = Pick<State, "conversationId" | "messages" | "startedAt" | "updatedAt" | "history"> & { owner: string | null }

const EMPTY: Stored = { owner: null, conversationId: null, messages: [], startedAt: null, updatedAt: null, history: [] }

const restore = (): Stored => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Stored | null
    if (saved && Array.isArray(saved.messages) && Array.isArray(saved.history)) {
      const history = saved.history.filter((h) => fresh(h.updatedAt))
      return fresh(saved.updatedAt) ? { ...saved, history } : { ...EMPTY, owner: saved.owner, history }
    }
  } catch {
    // Sin localStorage o con algo corrupto: se empieza de cero.
  }
  return EMPTY
}

const stored = restore()
let owner = stored.owner

const persist = () => {
  try {
    if (state.messages.length === 0 && state.history.length === 0) localStorage.removeItem(STORAGE_KEY)
    else {
      const data: Stored = { owner, conversationId: state.conversationId, messages: state.messages, startedAt: state.startedAt, updatedAt: state.updatedAt, history: state.history }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  } catch {
    // Sin localStorage (modo privado estricto): las conversaciones solo viven en memoria.
  }
}

let state: State = {
  conversationId: stored.conversationId,
  messages: stored.messages,
  startedAt: stored.startedAt,
  updatedAt: stored.updatedAt,
  history: stored.history,
  sending: false,
  error: null,
  usage: null,
}
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  if ("messages" in patch || "conversationId" in patch || "history" in patch) persist()
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useAssistantChat = () => useSyncExternalStore(subscribe, () => state, () => state)

/** De quién son las conversaciones guardadas: si entra otra cuenta en el navegador, se borran. */
export const setChatOwner = (email: string) => {
  if (owner === email) return
  const changed = owner !== null
  owner = email
  if (changed) clearChat()
  else persist()
}

/** Manda un mensaje; false si no se pudo (la caja de texto lo recupera para reintentarlo). */
export async function sendChatMessage(text: string, language: string): Promise<boolean> {
  const message = text.trim()
  if (!message || state.sending) return false
  set({
    messages: [...state.messages, { role: "user", text: message }],
    startedAt: state.startedAt ?? new Date().toISOString(),
    sending: true,
    error: null,
  })
  try {
    const reply = await sendAssistantMessage(message, language, state.conversationId)
    set({
      conversationId: reply.conversationId,
      messages: [...state.messages, { role: "assistant", text: reply.message, items: reply.items, support: reply.support || undefined }],
      updatedAt: new Date().toISOString(),
      usage: reply.usage,
      sending: false,
    })
    return true
  } catch (e) {
    const error: ChatError = e instanceof ApiError && e.code === "assistant_limit" ? "limit" : e instanceof ApiError && e.status === 503 ? "unavailable" : "other"
    // El mensaje que no se pudo responder no cuenta: se quita para poder reintentarlo.
    const messages = state.messages.slice(0, -1)
    set({ messages, startedAt: messages.length ? state.startedAt : null, sending: false, error })
    return false
  }
}

/** Manda la conversación de ahora a Soporte y lo apunta en el mensaje que lo ofreció. */
export async function sendChatToSupport(index: number): Promise<boolean> {
  const conversationId = state.conversationId
  if (conversationId == null) return false
  try {
    await sendAssistantSupport(conversationId)
  } catch {
    return false
  }
  if (state.conversationId === conversationId)
    set({ messages: state.messages.map((m, i) => (i === index ? { ...m, supportSent: true } : m)) })
  return true
}

/** La conversación de ahora como entrada del historial (null si está vacía o el backend aún no la conoce). */
export const currentAsSaved = (s: Pick<State, "conversationId" | "messages" | "startedAt" | "updatedAt"> = state): SavedChat | null => {
  if (s.conversationId == null || s.messages.length === 0) return null
  const now = new Date().toISOString()
  return { conversationId: s.conversationId, messages: s.messages, startedAt: s.startedAt ?? now, updatedAt: s.updatedAt ?? now }
}

/** La conversación de ahora, al principio del historial; fuera las de hace más de 24 h. */
const archived = (): SavedChat[] => {
  const history = state.history.filter((h) => fresh(h.updatedAt))
  const current = currentAsSaved()
  return current ? [current, ...history.filter((h) => h.conversationId !== current.conversationId)] : history
}

/** «Nueva conversación»: la de ahora pasa al historial y se empieza de cero. */
export const resetChat = () => set({ history: archived(), conversationId: null, messages: [], startedAt: null, updatedAt: null, error: null })

/** Vuelve a una conversación del historial (se puede seguir escribiendo en ella). */
export const openSavedChat = (conversationId: number) => {
  if (state.sending) return
  const history = archived()
  const chat = history.find((h) => h.conversationId === conversationId)
  if (!chat) return
  set({
    history: history.filter((h) => h.conversationId !== conversationId),
    conversationId: chat.conversationId,
    messages: chat.messages,
    startedAt: chat.startedAt,
    updatedAt: chat.updatedAt,
    error: null,
  })
}

/** Al cerrar sesión (o si entra otra cuenta): que nadie vea las conversaciones de otro. */
export const clearChat = () => set({ conversationId: null, messages: [], startedAt: null, updatedAt: null, history: [], error: null, usage: null })

export const setChatUsage = (usage: AssistantUsage) => set({ usage })

/** Enlace a un clip recomendado por PAFRI: el reproductor ofrece luego el siguiente de la lista. */
export const pafriHref = (item: Pick<ContentItem, "id" | "type">) => `${watchHref(item)}&from=pafri`

/**
 * La lista de PAFRI en la que está este contenido: la respuesta más reciente que lo recomendó (de
 * la conversación de ahora o de las del historial), y su posición en ella. null si no está en ninguna.
 */
export const findPafriList = (item: Pick<ContentItem, "id" | "type">): { items: ContentItem[]; index: number } | null => {
  for (const messages of [state.messages, ...state.history.map((h) => h.messages)]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const items = messages[i].items ?? []
      const index = items.findIndex((it) => it.id === item.id && it.type === item.type)
      if (index >= 0) return { items, index }
    }
  }
  return null
}
