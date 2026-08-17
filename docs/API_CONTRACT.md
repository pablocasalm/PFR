# Padel Film Room — Contrato de API (MVP)

> **El frontend define el contrato; el backend se adapta.** Este documento enumera **todo** lo que
> el frontend espera del backend: endpoints, forma de request/response y qué pantalla alimenta cada uno.
> Está generado a partir de los tipos reales del front (`src/lib/api/*.ts`, `src/lib/api/types.ts`).
>
> **Estado: implementado y en producción.** Todos los endpoints de este documento existen y
> están desplegados salvo que se indique lo contrario explícitamente.

## Generalidades

- **Base URL**: `VITE_API_URL` (`.env`). En local apunta a `https://api.padelfilmroom.com`; el fallback es `http://localhost:5196`.
- **Auth**: JWT Bearer. El front adjunta `Authorization: Bearer <token>` automáticamente si hay token en `localStorage`. **Todos** los endpoints de contenido requieren sesión (`[Authorize]`) — no hay nada público.
- **Content-Type**: `application/json` en la mayoría de request/response. Excepción: `POST /api/feedback` va como **`multipart/form-data`** (permite adjuntar una imagen) — el cliente usa `apiPostForm` en vez de `apiPost` (`src/lib/api/client.ts`). Los endpoints que devuelven una imagen (`GET .../image`) devuelven el binario crudo con su `Content-Type`, no JSON — el cliente los trae como `Blob` (`apiGetBlob`).
- **Errores**: ante `!res.ok`, el front lee el cuerpo y usa `{"message": "..."}` si existe; si no, el texto crudo. Devuelve `Error(status)` si no hay cuerpo.
- **Respuestas "con forma de pantalla" (BFF)**: varios GET devuelven exactamente lo que una pantalla necesita (Home, Explore, Search, Saved). No son CRUD genéricos.

### Leyenda de estado
- ✅ **Implementado** — en producción.
- ⬜ **No implementado** — hueco consciente, sin código todavía.

---

## DTOs compartidos

### `ContentItem` — tarjeta común (Inicio, Explorar, Resultados, Mi Lista, relacionados)
```ts
{
  id: string
  type: "clip" | "analysis"
  title: string
  thumbnailUrl: string
  durationSeconds: number
  concepts: string[]            // unión plana de conceptos
  blocks?: { block: string; concepts: string[] }[]  // conceptos por bloque (coloreado en Explorar)
  players?: string              // "Chingotto, Galán, Lebrón, Stupa"
  tournament?: string           // "Premier Padel P2 · Génova 2024 · Cuartos"
  block?: string                // bloque táctico principal (contexto)
  level?: string                // campo heredado, sin uso: el filtro "Nivel" se retiró de la UI
  progress?: number             // 0-100 (continúa viendo / vistos recientemente)
}
```

### `Comment`
```ts
{ id: string; user: string; initials?: string; ago: string /* "Hace 2 h" */; text: string; likes?: number }
```

### `Chapter` (análisis)
```ts
{ startSeconds: number; title: string; concept?: string; clipId?: string }
```

### `AppearsIn` (clip → análisis de origen)
```ts
{ analysisId: string; title: string; event?: string; thumbnailUrl?: string }
```

---

## Endpoints

### Auth
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/auth/login` | `{ email, password }` | `AuthResponse` |
| ✅ | POST | `/api/auth/register` | `{ email, password, displayName? }` | `AuthResponse` |

`AuthResponse`: `{ ok: boolean; message?: string; token?: string; email?: string; displayName?: string|null; role?: "User"|"Admin"|"ContentCreator" }`

### Contenido (pantallas)
| Estado | Método | Ruta | Response | Pantalla |
|---|---|---|---|---|
| ✅ | GET | `/api/home` | `HomeResponse` | Inicio (§7) |
| ✅ | GET | `/api/explore` | `ExploreResponse` | Explorar (§8) |
| ✅ | GET | `/api/clips/{id}` | `ClipDetail` | Página de Clip (§9) |
| ✅ | GET | `/api/analyses/{id}` | `AnalysisDetail` | Página de Análisis (§10) |
| ✅ | GET | `/api/search?block&concept&type&sort&feed` | `SearchResponse` | Resultados (§11) |

```ts
HomeResponse = { hero: ContentItem|null; continueWatching: ContentItem[]; newThisWeek: ContentItem[]; popularConcepts: { name: string; clipCount: number }[]; mostViewedThisWeek: ContentItem[] }

ExploreResponse = { sections: { block: string; concepts: string[]; clips: ContentItem[] }[]; analyses: ContentItem[] }

ClipDetail = { id; type:"clip"; title; description; durationSeconds; thumbnailUrl; videoUrl; concepts: string[]; blocks: string[]; resumeSeconds?; appearsIn?: AppearsIn|null; related: ContentItem[]; comments: Comment[]; likes?; savedByMe?; likedByMe? }

AnalysisDetail = { id; type:"analysis"; title; description; durationSeconds; thumbnailUrl; videoUrl; players?; tournament?; concepts: string[]; resumeSeconds?; chapters: Chapter[]; related: ContentItem[]; comments: Comment[]; likes?; savedByMe? }

SearchResponse = { query: string; total: number; tabs: { key; label; count }[]; results: ContentItem[] }
```

`videoUrl` en `ClipDetail`/`AnalysisDetail` es una **URL de Cloudflare Stream firmada al vuelo** (`CloudflareStreamService.SignPlaybackUrl`, JWT RS256, caduca a las **6h**) — no un manifiesto público. Sin sesión válida, el backend no la genera.

**`/api/search` — parámetros:** `block`, `concept`, `type` (`clip`|`analysis`), `sort` (`relevance`|`recent`|`views`|`duration`), `feed` (`new`|`popular`|`history`). El backend también acepta `q` (texto, match por substring **bidireccional**) por compatibilidad, pero **el frontend ya no lo manda** — trae el catálogo completo y hace *fuzzy matching* en cliente con **Fuse.js** (`Search.tsx`), para tolerar plurales/erratas y mostrar resultados parecidos en vez de una pantalla vacía. `level` se retiró del contrato (el filtro "Nivel" no existe en la UI).

### Mi Lista (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | GET | `/api/saved` | — | `{ clips: ContentItem[]; analyses: ContentItem[] }` |
| ✅ | GET | `/api/saved/ids` | — | `string[]`  → `["clip:c1","analysis:a1"]` |
| ✅ | POST | `/api/saved/toggle` | `{ contentType: "clip"|"analysis"; contentId }` | `{ ok: boolean; saved: boolean }` |

### Social (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/clips/{id}/like` | — | `{ liked: boolean; likes: number }` |
| ✅ | POST | `/api/analyses/{id}/like` | — | `{ liked: boolean; likes: number }` |
| ✅ | POST | `/api/clips/{id}/comments` | `{ text }` | `Comment` (el creado) |
| ✅ | POST | `/api/analyses/{id}/comments` | `{ text }` | `Comment` (el creado) |

### Historial (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/history/progress` | `{ contentType, contentId, positionSeconds, durationSeconds }` | `{ ok; saved; completed? }` |
| ✅ | GET | `/api/history/recent` | — | `ContentItem[]` (con `progress`) |
| ✅ | GET | `/api/history/stats` | — | `{ minutes; clipsViewed; analysesViewed; concepts: {name,count}[]; blocks: {name,count}[] }` |

Definiciones (§6): **iniciado** = reproducción efectiva > 10 s; **completado** = ≥ 90 % de la duración (umbral exacto en `HistoryController`: `PositionSeconds >= 0.9 * DurationSeconds`). `continueWatching` y `history/recent` = iniciados y no completados / vistos recientemente.

### Publicar — Cloudflare Stream (rol Admin/ContentCreator)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/admin/videos/direct-upload` | `{ name, size }` | `{ uploadURL, uid }` |
| ✅ | GET | `/api/admin/videos/{uid}/status` | — | `{ state: string; ready: boolean }` |
| ✅ | POST | `/api/admin/publish` | `PublishInput` (análisis + clips con `uid`, capítulos) | `{ ok; analysisId; clipIds }` |
| ✅ | GET | `/api/admin/lookup?type=&q=&block=` | — | `string[]` (autocompletado) |
| ✅ | DELETE | `/api/admin/clips/{id}` | — | `{ ok }` (borra el clip, cascada de conceptos/capítulos, limpia comentarios/likes/guardados/historial) |
| ✅ | DELETE | `/api/admin/analyses/{id}` | — | `{ ok }` (igual, para análisis) |
| ✅ | POST | `/api/admin/videos/require-signed-urls` | — | `{ total; ok; failed[] }` (acción puntual: fuerza URLs firmadas en vídeos ya existentes de Cloudflare) |

`type` de lookup: `player` | `venue` | `category` | `concept` (para conceptos, `block` filtra sugerencias). `PublishInput.analysis.chapters`: `{ startSeconds, title, concept? }[]` — capítulos v1, minuto escrito a mano (no hay scrubber de vídeo todavía).

### Feedback de la beta (auth; gestión solo Admin)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/feedback` | `multipart/form-data`: `message, type?, page?, contentType?, contentId?, image?` | `{ ok }` |
| ✅ | GET | `/api/admin/feedback?status=&type=` | — | `{ items: FeedbackItem[]; counts }` |
| ✅ | GET | `/api/admin/feedback/{id}/image` | — | binario (imagen), 404 si no tiene |
| ✅ | PATCH | `/api/admin/feedback/{id}` | `{ status?, adminNote? }` | `{ ok; status; resolvedAtUtc; adminNote }` |
| ✅ | DELETE | `/api/admin/feedback/{id}` | — | `{ ok }` |

`image` es opcional, máx. 5 MB, `png|jpeg|webp|gif`. Se guarda como `byte[]` en SQL (no en
almacenamiento externo) y un `BackgroundService` (`FeedbackImageCleanupService`, corre cada
6h) la borra **1 día después** de que el reporte pase a `status: "resolved"` — los reportes
sin resolver no se tocan, por muy antiguos que sean.

---

## Guía de verificación (QA) — qué comprobar, dónde y qué deberías ver

> **Cómo detectar fallos**: las pantallas que hacen **GET** muestran un mensaje visible si el backend falla
> (*"No se pudo cargar … ¿Está el backend en marcha?"*). Las acciones **POST** (like, comentar, guardar,
> progreso) son **optimistas y silenciosas**: si fallan, revierten sin aviso. Por eso, para verificarlas abre
> **DevTools → pestaña Network → filtro Fetch/XHR** y mira el status de cada petición:
> **200/2xx** = OK · **401** = falta/expiró el token · **404** = endpoint no existe · **500** = error del servidor.

Levanta el front con `npm run dev` (queda en `localhost`, que es contexto seguro para compartir/portapapeles).

| # | Dónde ir | Qué hacer | Qué deberías ver | Endpoint |
|---|---|---|---|---|
| 1 | `/login` | Entrar con credenciales reales | Redirige a `/app/inicio`; el header muestra tu nombre | `POST /api/auth/login` |
| 2 | `/app/inicio` | — | Hero + "Nuevo esta semana" + "Conceptos populares" + "Más vistos". "Continúa viendo" solo si tienes historial | `GET /api/home` |
| 3 | `/app/explorar` | Pulsar un chip de concepto de un bloque | La fila filtra **in situ** (sin cambiar de página) | `GET /api/explore` |
| 4 | `/app/explorar` | Pulsar "Ver todo" de un bloque | Va a Resultados con ese bloque como filtro (chip aplicado) | `GET /api/search?block=…` |
| 5 | Icono de búsqueda (header en escritorio, overlay a pantalla completa en móvil) | Buscar algo con un plural o una errata leve (p. ej. "Globos" en vez de "Globo") | Aterriza en `/app/search` **solo tras enviar**; encuentra resultados parecidos igualmente (fuzzy en cliente) | catálogo vía `GET /api/search?sort&feed`, filtrado con Fuse.js en cliente |
| 6 | `/app/search` | Cambiar Tipo/Bloque/Concepto (`FilterPanel`), ordenar, quitar chips | Los resultados y los contadores de las tabs cambian; estado "sin resultados" si no hay | filtrado en cliente sobre el catálogo ya traído |
| 7 | `/app/watch?c=<clipId>` | Reproducir | El vídeo carga y reproduce (HLS, URL firmada). Al avanzar >10 s se guarda progreso | `GET /api/clips/{id}` · `POST /api/history/progress` |
| 8 | ▲ misma página | Pulsar **Me gusta** | El corazón se rellena y sube el contador (si el POST responde `{liked,likes}`) | `POST /api/clips/{id}/like` |
| 9 | ▲ misma página | Escribir y **Publicar** un comentario | El comentario aparece arriba del todo (bottom-sheet en móvil) | `POST /api/clips/{id}/comments` |
| 10 | ▲ misma página | Pulsar **Mi Lista** (guardar) | Cambia a estado guardado | `POST /api/saved/toggle` |
| 11 | ▲ misma página | Dejar terminar el vídeo | Aparece la tarjeta "Siguiente clip en 3, 2, 1…" (cancelable) o, en móvil sin fullscreen, "↓ Sigue aprendiendo" | (usa `related` del detalle) |
| 12 | `/app/watch?v=<analysisId>` | Pulsar un capítulo | El reproductor salta al minuto exacto sin recargar | `GET /api/analyses/{id}` (`chapters[]`) |
| 13 | `/app/mi-lista` | — | Tus clips y análisis guardados; **Vistos recientemente** si hay historial | `GET /api/saved` · `GET /api/history/recent` |
| 14 | ▲ misma página | "Gestionar" → seleccionar → Eliminar / Vaciar | Los elementos desaparecen (toggle en backend) | `POST /api/saved/toggle` |
| 15 | `/app/mi-juego` | — | Minutos, clips/análisis vistos, rankings de conceptos y bloques | `GET /api/history/stats` |
| 16 | ▲ misma página | "Compartir/Descargar" resumen | Genera imagen 9:16 (comparte en móvil / descarga en escritorio) | (cliente, sin backend) |
| 17 | `/app/publicar` (Admin/CC) | Subir un vídeo, añadir capítulos y publicar | Sube a Cloudflare y crea análisis+clips (+capítulos) | `POST /api/admin/videos/direct-upload` → subida → `POST /api/admin/publish` |
| 18 | Botón flotante de feedback (cualquier pantalla) | Reportar con una captura adjunta | El reporte se envía; aparece en el panel de admin con miniatura | `POST /api/feedback` (`multipart/form-data`) |
| 19 | `/app/admin/reportes` (Admin) | Abrir la miniatura de un reporte, marcarlo resuelto | Se ve la imagen a tamaño completo (lightbox); al resolver se sella `resolvedAtUtc` | `GET .../image` · `PATCH /api/admin/feedback/{id}` |

### Señales rápidas de que algo del backend falta
- Una pantalla de las de la fila 2/3/13/15 muestra *"No se pudo cargar…"* → el **GET** correspondiente devuelve error (mira su status en Network).
- Das a **Me gusta** y el corazón vuelve solo a su estado → el **POST like** no respondió OK.
- Publicas un comentario y **no aparece** → el **POST comments** falló.
- Guardas en Mi Lista, recargas y **ya no está** → `/api/saved/toggle` o `/api/saved` no persisten.
- "Vistos recientemente" **no sale nunca** aun habiendo visto contenido → falta `GET /api/history/recent` o no devuelve `progress`.

### Comprobaciones de reproducción (Cloudflare)
- El `videoUrl` de `ClipDetail`/`AnalysisDetail` es una URL **firmada** de Cloudflare Stream (no un `.m3u8` público) — caduca a las 6h, así que un enlace copiado deja de funcionar pasado ese tiempo (esperado, no es un bug).
- Si el vídeo no carga: revisa en Network que la URL firmada y sus segmentos devuelvan 200 (CORS incluido), y que el token no haya caducado.
- El selector de calidad aparece solo si el manifiesto trae varios niveles; el de **"Audio con IA"** está marcado *Próximamente* (no hay contenido multi-idioma todavía, esperado).

---

## Huecos conscientes (no son bugs, son alcance no cubierto todavía)
- **Selector de idioma de audio** (§6, §9.1, §10.1): no hay UI — no bloquea porque no existe
  contenido en varios idiomas todavía. Placeholder "Audio con IA · Próximamente" en Ajustes.
- **Capítulos v2**: hoy el minuto de inicio se escribe a mano en `/app/publicar`; una v2 con
  scrubber sobre el vídeo (marcar visualmente en vez de escribir `mm:ss`) queda pendiente.
- **Búsquedas recientes entre dispositivos**: hoy es solo local (`localStorage`, por
  dispositivo). Sincronizarlas vía backend es un cambio futuro, no bloqueante.
- El filtrado de `/api/search` (block/concept/type/texto) es todo **client-side** hoy — es
  una decisión consciente (evita el bug de contadores de tabs corruptos al combinar filtros
  server-side + client-side), válida mientras el catálogo quepa cómodo en una respuesta. Si
  el catálogo crece mucho, revisar si conviene mover parte del filtrado/paginación a servidor.
