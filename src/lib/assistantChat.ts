import { useSyncExternalStore } from "react"
import { ApiError } from "./api/client"
import { sendAssistantMessage, type AssistantUsage } from "./api/assistant"
import type { ContentItem } from "./api/types"

/**
 * Conversación del chat del muñeco (fase 1, tarjeta #147). Vive en memoria mientras la app está
 * abierta: cerrar el panel no la pierde, recargar la página sí (no hay historial para el usuario; las
 * conversaciones se guardan en el backend 12 meses para revisarlas nosotros).
 */
export type ChatMessage = { role: "user" | "assistant"; text: string; items?: ContentItem[] }
export type ChatError = "limit" | "unavailable" | "other"

type State = {
  conversationId: number | null
  messages: ChatMessage[]
  sending: boolean
  error: ChatError | null
  /** Lo último que devolvió el backend; null hasta el primer mensaje (el panel pide /usage al abrirse). */
  usage: AssistantUsage | null
}

let state: State = { conversationId: null, messages: [], sending: false, error: null, usage: null }
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useAssistantChat = () => useSyncExternalStore(subscribe, () => state, () => state)

/** Manda un mensaje; false si no se pudo (la caja de texto lo recupera para reintentarlo). */
export async function sendChatMessage(text: string, language: string): Promise<boolean> {
  const message = text.trim()
  if (!message || state.sending) return false
  set({ messages: [...state.messages, { role: "user", text: message }], sending: true, error: null })
  try {
    const reply = await sendAssistantMessage(message, language, state.conversationId)
    set({
      conversationId: reply.conversationId,
      messages: [...state.messages, { role: "assistant", text: reply.message, items: reply.items }],
      usage: reply.usage,
      sending: false,
    })
    return true
  } catch (e) {
    const error: ChatError = e instanceof ApiError && e.code === "assistant_limit" ? "limit" : e instanceof ApiError && e.status === 503 ? "unavailable" : "other"
    // El mensaje que no se pudo responder no cuenta: se quita para poder reintentarlo.
    set({ messages: state.messages.slice(0, -1), sending: false, error })
    return false
  }
}

/** «Nueva conversación»: empieza de cero (la anterior queda guardada en el backend). */
export const resetChat = () => set({ conversationId: null, messages: [], error: null })

export const setChatUsage = (usage: AssistantUsage) => set({ usage })
