# Padel Film Room — Contrato de API (MVP)

> **El frontend define el contrato; el backend se adapta.** Este documento enumera **todo** lo que
> el frontend ya espera del backend: endpoints, forma de request/response y qué pantalla alimenta cada uno.
> Está generado a partir de los tipos reales del front (`src/lib/api/*.ts`, `src/lib/api/types.ts`).

## Generalidades

- **Base URL**: `VITE_API_URL` (`.env`). En local apunta a `https://api.padelfilmroom.com`; el fallback es `http://localhost:5196`.
- **Auth**: JWT Bearer. El front adjunta `Authorization: Bearer <token>` automáticamente si hay token en `localStorage`.
- **Content-Type**: `application/json` en todo (request y response).
- **Errores**: ante `!res.ok`, el front lee el cuerpo y usa `{"message": "..."}` si existe; si no, el texto crudo. Devuelve `Error(status)` si no hay cuerpo.
- **Respuestas "con forma de pantalla" (BFF)**: varios GET devuelven exactamente lo que una pantalla necesita (Home, Explore, Search, Saved). No son CRUD genéricos.

### Leyenda de estado
- ✅ **Existente** — ya estaba antes de esta ronda.
- 🆕 **Nuevo** — contrato introducido/ampliado recientemente; hay que implementarlo/ajustarlo.
- 🔎 **Verificar** — debería existir, pero conviene confirmar forma exacta.

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
  level?: string                // "intermedio" | "avanzado"  🆕 (filtro §8.2)
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
| 🆕 | GET | `/api/search?q&block&concept&level&type&sort&feed` | `SearchResponse` | Resultados (§11) |

```ts
HomeResponse = { hero: ContentItem|null; continueWatching: ContentItem[]; newThisWeek: ContentItem[]; popularConcepts: { name: string; clipCount: number }[]; mostViewedThisWeek: ContentItem[] }

ExploreResponse = { sections: { block: string; concepts: string[]; clips: ContentItem[] }[]; analyses: ContentItem[] }

ClipDetail = { id; type:"clip"; title; description; durationSeconds; thumbnailUrl; videoUrl; concepts: string[]; blocks: string[]; resumeSeconds?; appearsIn?: AppearsIn|null; related: ContentItem[]; comments: Comment[]; likes?; savedByMe?; likedByMe? }

AnalysisDetail = { id; type:"analysis"; title; description; durationSeconds; thumbnailUrl; videoUrl; players?; tournament?; concepts: string[]; resumeSeconds?; chapters: Chapter[]; related: ContentItem[]; comments: Comment[]; likes?; savedByMe? }

SearchResponse = { query: string; total: number; tabs: { key; label; count }[]; results: ContentItem[] }
```

**`/api/search` — parámetros (todos opcionales, combinables):** `q` (texto), `block` (nombre de bloque), `concept`, `level` (`intermedio`|`avanzado`), `type` (`clip`|`analysis`), `sort` (`relevance`|`recent`|`views`|`duration`), `feed` (`new`|`popular`|`history`). El front refina en cliente lo que puede (tipo/concepto/bloque/nivel/orden por duración), pero **para catálogos grandes el filtrado debe hacerse en servidor** y devolver `level` en los items.

### Mi Lista (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| 🔎 | GET | `/api/saved` | — | `{ clips: ContentItem[]; analyses: ContentItem[] }` |
| 🔎 | GET | `/api/saved/ids` | — | `string[]`  → `["clip:c1","analysis:a1"]` |
| 🔎 | POST | `/api/saved/toggle` | `{ contentType: "clip"|"analysis"; contentId }` | `{ ok: boolean; saved: boolean }` |

### Social (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| 🆕 | POST | `/api/clips/{id}/like` | — | `{ liked: boolean; likes: number }` |
| 🆕 | POST | `/api/analyses/{id}/like` | — | `{ liked: boolean; likes: number }` |
| 🆕 | POST | `/api/clips/{id}/comments` | `{ text }` | `Comment` (el creado) |
| 🆕 | POST | `/api/analyses/{id}/comments` | `{ text }` | `Comment` (el creado) |

### Historial (auth)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| ✅ | POST | `/api/history/progress` | `{ contentType, contentId, positionSeconds, durationSeconds }` | `{ ok; saved; completed? }` |
| 🆕 | GET | `/api/history/recent` | — | `ContentItem[]` (con `progress`) |
| ✅ | GET | `/api/history/stats` | — | `{ minutes; clipsViewed; analysesViewed; concepts: {name,count}[]; blocks: {name,count}[] }` |

Definiciones (§6): **iniciado** = reproducción efectiva > 10 s; **completado** = ≥ 90 % de la duración. `continueWatching` y `history/recent` = iniciados y no completados / vistos recientemente.

### Publicar — Cloudflare Stream (rol Admin/ContentCreator)
| Estado | Método | Ruta | Request | Response |
|---|---|---|---|---|
| 🔎 | POST | `/api/admin/videos/direct-upload` | `{ name, size }` | `{ uploadURL, uid }` |
| 🔎 | GET | `/api/admin/videos/{uid}/status` | — | `{ state: string; ready: boolean }` |
| 🔎 | POST | `/api/admin/publish` | `PublishInput` (análisis + clips con `uid`) | `{ ok; analysisId; clipIds }` |
| 🔎 | GET | `/api/admin/lookup?type=&q=&block=` | — | `string[]` (autocompletado) |

`type` de lookup: `player` | `venue` | `category` | `concept` (para conceptos, `block` filtra sugerencias).

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
| 5 | `/app/search` | Cambiar Tipo/Nivel/Bloque, ordenar, quitar chips | Los resultados y los contadores de las tabs cambian; estado "sin resultados" si no hay | `GET /api/search?…` |
| 6 | `/app/watch?c=<clipId>` | Reproducir | El vídeo carga y reproduce (HLS). Al avanzar >10 s se guarda progreso | `GET /api/clips/{id}` · `POST /api/history/progress` |
| 7 | ▲ misma página | Pulsar **Me gusta** | El corazón se rellena y sube el contador (si el POST responde `{liked,likes}`) | `POST /api/clips/{id}/like` |
| 8 | ▲ misma página | Escribir y **Publicar** un comentario | El comentario aparece arriba del todo | `POST /api/clips/{id}/comments` |
| 9 | ▲ misma página | Pulsar **Mi Lista** (guardar) | Cambia a estado guardado | `POST /api/saved/toggle` |
| 10 | ▲ misma página | Dejar terminar el vídeo | Aparece la tarjeta "Siguiente clip en 3, 2, 1…" | (usa `related` del detalle) |
| 11 | `/app/watch?v=<analysisId>` | — | Capítulos navegables; like/comentarios/guardar igual que en clip | `GET /api/analyses/{id}` (+ like/comments) |
| 12 | `/app/mi-lista` | — | Tus clips y análisis guardados; **Vistos recientemente** si hay historial | `GET /api/saved` · `GET /api/history/recent` |
| 13 | ▲ misma página | "Gestionar" → seleccionar → Eliminar | Los elementos desaparecen (toggle en backend) | `POST /api/saved/toggle` |
| 14 | `/app/mi-juego` | — | Minutos, clips/análisis vistos, rankings de conceptos y bloques | `GET /api/history/stats` |
| 15 | ▲ misma página | "Compartir/Descargar" resumen | Genera imagen 9:16 (comparte en móvil / descarga en escritorio) | (cliente, sin backend) |
| 16 | `/app/publicar` (Admin/CC) | Subir un vídeo y publicar | Sube a Cloudflare y crea análisis+clips | `POST /api/admin/videos/direct-upload` → subida → `POST /api/admin/publish` |

### Señales rápidas de que algo del backend falta
- Una pantalla de las de la fila 2/3/12/14 muestra *"No se pudo cargar…"* → el **GET** correspondiente devuelve error (mira su status en Network).
- Das a **Me gusta** y el corazón vuelve solo a su estado → el **POST like** no respondió OK.
- Publicas un comentario y **no aparece** → el **POST comments** falló.
- Guardas en Mi Lista, recargas y **ya no está** → `/api/saved/toggle` o `/api/saved` no persisten.
- "Vistos recientemente" **no sale nunca** aun habiendo visto contenido → falta `GET /api/history/recent` o no devuelve `progress`.

### Comprobaciones de reproducción (Cloudflare)
- El `videoUrl` de `ClipDetail`/`AnalysisDetail` debe ser un **manifiesto HLS** (`.m3u8`).
- Si el vídeo no carga: revisa en Network que el `.m3u8` y sus segmentos devuelvan 200 (CORS incluido).
- El selector de calidad aparece solo si el manifiesto trae varios niveles; el de **"Audio con IA"** está marcado *Próximamente* (aún no funcional, esperado).

---

## Notas de implementación pendientes (recordatorio)
- ⚠️ **Antes de producción**: URLs firmadas para el vídeo (signed URLs) — Fase 2.
- El filtrado de `/api/search` debe ser **server-side** para catálogos grandes; incluir `level` en los `ContentItem`.
- `related` (en clip y análisis) debería venir **ordenado por relevancia**: mismo concepto primero, luego mismo bloque (alimenta el autoplay "Siguiente").
