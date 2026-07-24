# Padel Film Room — Frontend

Plataforma de vídeo táctico de pádel: **clips** (cortos, un concepto) y **análisis/vídeos** (largos, con capítulos). Frontend en React + Vite contra el backend `PFR_API` (.NET 9).

> **Cómo se usa este README.** Es un **roadmap vivo**. Cada bloque grande lleva estado
> (✅ hecho · 🚧 en curso · ⬜ pendiente). **Al completar algo, se añaden debajo los
> subpasos que nacen de ese avance**, para tener siempre claro el siguiente camino.
>
> **Principio rector: el FRONTEND manda sobre el backend.** El frontend define el modelo y
> el contrato; el backend se **adapta** a lo que necesita la UI, **nunca al revés**. El
> backend actual proviene de un diseño anterior: se reutiliza si encaja, y se **cambia**
> cuando no. Jamás se deforma el frontend para aceptar lo que ya hay en el backend.

---

## Stack
- **React 19 + TypeScript + Vite**, **React Router 7**, **Tailwind 3**, **lucide-react**.
- Data fetching con **hooks propios** (sin React Query). Sin providers globales.
- Backend: **PFR_API** (.NET 9 + SQL Server + JWT) en `/Backend` (no publicado aún).

## Estructura del front
```
src/
├── App.tsx, main.tsx, index.css
├── app/router/router.tsx        # rutas (/ → /app/inicio)
├── lib/                         # capa de datos
│   ├── config.ts                # API_BASE (VITE_API_URL)
│   ├── api/{client,types,clips}.ts
│   └── hooks/useApi.ts
├── styles/theme.css             # bg-film-room
└── pages/App/
    ├── index.tsx                # AppLayout (Header + Outlet)
    ├── components/Header.tsx
    └── pages/{Inicio,Explorar,MiLista,MiJuego,Watch,Clip,Video,Search}.tsx
```

## Puesta en marcha (dev)
```bash
npm install
npm run dev          # front en http://localhost:5173
```
- Configurar backend en `.env`: `VITE_API_URL=http://localhost:5196` (copiar de `.env.example`).
- El backend (`/Backend/PFR_Backend`) requiere **SQL Server** y se levanta con `dotnet run`. CORS ya permite `localhost:5173`.
- **Migraciones** (esquema gestionado por EF, no `EnsureCreated`). Desde `Backend/PFR_Backend/Database`:
  ```bash
  dotnet ef migrations add MigrationXX
  dotnet ef database update
  ```
  La API también aplica migraciones pendientes al arrancar (`db.Database.Migrate()`) y luego siembra datos de ejemplo. El `DbContextFactory` (diseño) y la API de dev apuntan a `PfrDbDev`.
- ⚠️ Fricciones dev conocidas: SQL Server en macOS (usar Docker) y `UseHttpsRedirection()` puede redirigir el `fetch` a `https://localhost:7238` (cert autofirmado).

---

## Backend actual (legacy — solo referencia)
> Esto es lo que el backend expone **hoy**, de un diseño anterior. No es el objetivo:
> el contrato real lo define el frontend (ver bloque 5). Sirve para saber qué se puede
> reutilizar tal cual y qué hay que cambiar.

| Método | Ruta | Auth | Devuelve |
|---|---|---|---|
| GET | `/api/clips/{id}` | público | `ClipDetail` |
| GET | `/api/saved` · `/api/saved/ids` | 🔒 | Mi Lista (clips+análisis) · claves guardadas |
| POST | `/api/saved/toggle` | 🔒 | `{ ok, saved }` |
| POST | `/api/auth/register` · `/api/auth/login` | público | `{ token, email, displayName }` |

`Clip` (entidad, ya saneada): `id, title, description, durationSeconds, thumbnailUrl, clipVideoUrl, tagsCsv, block, level, players, tournament, publishedAtUtc, viewsLast7d, likesCount, isFeatured, appearsInAnalysisId`.

> **Limpieza backend (jun 2026).** Eliminadas piezas legacy que no encajan con el front nuevo:
> - `Clip`: quitadas columnas muertas `ideaKey`, `fullVideoUrl`, `chaptersJson`, `matchJson`, `subtitlesEsUrl`, `subtitlesEnUrl`. El enlace al vídeo largo vive en la relación `appearsInAnalysisId` → `Analysis.VideoUrl` (+ `Chapter.StartSeconds` para el segundo exacto), no en una URL duplicada. Subtítulos → V2 (traducción IA).
> - Borradas **Colecciones** (`Collection`, `CollectionClip`, controller, DTO) — no están en requerimientos; se organiza por Bloques/Conceptos + Mi Lista.
> - Borrada **Waitlist** (`WaitlistLead`, controller, request) — era de la landing antigua.
> - Borrado DTO muerto `ClipDto`.
> - **`Bookmark` → `SavedItem`** (Mi Lista): ahora es **polimórfico** (`ContentType` + `ContentId`, como `Comment`), guarda **clips y análisis**. `BookmarksController` → `SavedItemsController` (`/api/saved`, `/api/saved/ids`, `/api/saved/toggle`). Nombres alineados con el uso real para evitar confusiones.

---

## Almacenamiento de vídeo y metadatos (decisiones pendientes)

### Dónde se guardan los vídeos
- **El vídeo NO se guarda en SQL.** La BD solo guarda **referencias** (URL/uid). Hoy `thumbnailUrl`/`videoUrl` son rutas placeholder servidas desde `public/`.
- **Candidato: Cloudflare Stream** (servicio específico de vídeo): transcodifica, sirve **HLS adaptativo**, genera miniaturas y da `uid` + URL de reproducción (con URLs firmadas opcionales). Alternativas: **Mux**, **Bunny.net Stream**. (**Cloudflare R2** = solo almacenamiento de objetos S3, sin transcodificación.)
- Cuando se decida, `videoUrl` pasará a ser el **manifiesto HLS** (`.m3u8`). El **contrato del frontend no cambia** (sigue siendo `videoUrl` + `thumbnailUrl`); solo cambia de dónde sale la URL.

### Cómo se reproduce (dentro de la plataforma, sin links externos)
- El vídeo se reproduce **embebido** en nuestro player, el usuario nunca sale de la app.
- Plan (bloque 6): `<video>` propio + **hls.js** leyendo el `.m3u8` (Safari reproduce HLS nativo; Chrome/Firefox necesitan hls.js). El "link" es solo la **fuente** del `<video>`, no un destino de navegación.

### Formato de metadatos (provisional)
- Hoy: `concepts` como **CSV** (`TagsCsv`) y `block`/`level`/`players`/`tournament` como **texto plano**. Suficiente para el MVP.
- A futuro (según el doc de requerimientos): modelo **relacional** con entidades `Bloque`, `Concepto` y tabla **Clip-Bloque-Concepto** (necesario para "mostrar solo conceptos del bloque actual", filtros y métricas por concepto).
- El **contrato del frontend ya usa arrays** (`concepts: string[]`, `block: string`), así que migrar CSV → tablas **no tocará el frontend**.

---

## Roadmap (bloques grandes)

### 1. Base del front nuevo ✅
Maquetadas todas las pantallas (Inicio, Explorar, Mi Lista, Mi Juego, Watch vídeo/clip, Search), navbar, navegación cruzada, URLs limpias con `?v=`/`?c=`. Código viejo eliminado; app en `/app`.

### 2. Capa de datos ✅
`config` + `api/client` (fetch tipado con JWT) + `api/types` + `hooks/useApi`. Base URL por `.env`.

**Patrón de datos:** endpoints **con forma de pantalla (BFF)**, definidos por el frontend
(`/api/home`, luego `/api/explore`, `/api/results`…). Cada pantalla pide lo que necesita,
con el modelo **unificado `ContentItem`** (`type: clip | analysis`). Referencia funcional:
`public/PFR_Requerimientos/Requerimientos funcionales MVP.rtf`.

- [x] **Inicio** — consume `GET /api/home` (`{ hero, continueWatching, newThisWeek, popularConcepts, mostViewedThisWeek }`); las 5 secciones renderizan clips+análisis con `ContentItem`.
  - **Subpasos nacidos:**
    - [ ] **Implementar `GET /api/home` en el backend** según el contrato `HomeResponse` (bloque 5).
    - [ ] Botón **"Mi lista"** del Hero/tarjetas → depende de auth + Mi Lista (bloques 4 y 7).
    - [ ] **Ver todo** de cada sección → Pantalla de Resultados (`/app/search` reutilizable con filtros).
- [x] **Detalle de clip** (`/app/watch?c=:id`) — consume `GET /api/clips/{id}` → `ClipDetail` (ficha, conceptos, "Aparece en", comentarios, relacionados). Variante vertical en `&layout=vertical`.
- [x] **Detalle de análisis** (`/app/watch?v=:id`) — consume `GET /api/analyses/{id}` → `AnalysisDetail` (capítulos, conceptos, "Sigue aprendiendo", comentarios).
  - **Subpasos nacidos:**
    - [ ] **Implementar `GET /api/clips/{id}` y `GET /api/analyses/{id}`** en backend según `ClipDetail`/`AnalysisDetail` (bloque 5).
    - [ ] **Player real** con seek por capítulos y guardado de progreso (bloque 6).
    - [ ] **Comentarios**: publicar comentario (POST), cargar más ("Ver todos") y, en móvil, abrirlos como **bottom-sheet** (doc 9.8/10.8).
    - [ ] **Me gusta** y **Mi Lista** funcionales (toggle) → bloques 4 y 7.
    - [ ] **Autoplay / continuidad** (bloque 8): "Siguiente en 3, 2, 1…" y scroll vertical en móvil.
- [x] **Explorar** — consume `GET /api/explore` (bloques tácticos con conceptos + clips, y análisis completos).
- [x] **Search / Resultados** — consume `GET /api/search?q=` (resultados clips+análisis, pestañas con contadores).
  - **Subpasos nacidos:**
    - [ ] **Implementar `/api/explore` y `/api/search` en backend** (hecho en C#, pendiente compilar/levantar).
    - [ ] **Filtros** de Resultados funcionales (tipo, nivel, duración) y ordenación → query params.
    - [ ] Chips de concepto **filtran in-situ** dentro del bloque en Explorar (sin recargar).
    - [ ] **"Ver todo"** de cada bloque/concepto → Resultados con el filtro aplicado.
- [ ] **Mi Lista** — depende de auth + endpoint Mi Lista (bloques 4 y 7).
- [ ] **Mi Juego** — depende de stats de aprendizaje (bloque 5).

### 4. Autenticación 🚧
**Modelo: la app entera vive detrás de sesión** (`app.padelfilmroom`). No hay contenido
público dentro de `/app`: sin token se redirige a `/login`. Por eso la auth es una
**pantalla puerta**, no un modal, y no hay empty-states de "inicia sesión" dentro de la app.
- [x] **Backend completo** (ya existía): `register`/`login`, JWT (`sub`=userId), `PasswordHasher`, `CurrentUserAccessor`.
- [x] **Capa de auth front** sin provider global: `lib/api/auth.ts` (login/register) + `lib/auth/store.ts` (store con `useSyncExternalStore`, persiste `token`+`user` en localStorage; el `api/client` ya adjunta el token).
- [x] **Pantalla `/login`** `lib/auth/LoginPage.tsx` (login/registro con toggle). Si ya hay sesión, redirige a `/app/inicio`.
- [x] **Puerta** `lib/auth/RequireAuth.tsx` envolviendo **todo `/app`** → sin token, `Navigate` a `/login`.
- [x] **Header**: solo avatar con iniciales + menú "Cerrar sesión" (dentro siempre hay sesión).
- **Subpasos nacidos:**
  - [ ] Conectar **Mi Lista** real (`getSavedList`) — el empty-state correcto es §12.5 ("todavía no has guardado nada"), no "inicia sesión".
  - [ ] Botón **"Mi Lista"** y **Me gusta** en tarjetas/detalle (`toggleSaved`), con estado optimista vía `getSavedIds`.
  - [ ] **Auto-logout** ante 401 (token caducado) → vuelve a `/login`.
  - [ ] Probar el flujo de punta a punta con el backend levantado (requiere `dotnet` + SQL Server).

### 5. Contrato que el backend DEBE implementar (lo define el frontend) 🚧
La UI ya define qué datos necesita; el backend se reescribe para servirlos (no al revés).
Endpoints con **forma de pantalla** y modelo **`ContentItem`** unificado (clip | analysis).
> Implementado en C# (entidades + DTOs + controllers + seeder). **Pendiente: compilar, crear
> migración inicial y levantar** (no hay `dotnet` en el entorno de desarrollo actual).
- [x] **`GET /api/home`** → `HomeDto { hero, continueWatching, newThisWeek, popularConcepts, mostViewedThisWeek }` (`HomeController`).
- [x] **`GET /api/clips/{id}`** → `ClipDetailDto` (`ClipsController`).
- [x] **`GET /api/analyses/{id}`** → `AnalysisDetailDto` (`AnalysesController`).
- [x] **`GET /api/explore`** → `ExploreResponseDto` (`ExploreController`).
- [x] **`GET /api/search?q=`** → `SearchResponseDto` (`SearchController`).
- [x] **Vídeo/Análisis** como entidad propia (`Analysis` + `Chapter`).
- [x] **Capítulos** como entidad (`Chapter`) expuestos en `AnalysisDetail`.
- [x] **Niveles** y **torneos/jugadores** como campos en `Clip`/`Analysis`.
- [x] **Conceptos** (CSV) con **contadores** derivados en `/api/home`. **Bloques** como campo string.
- [x] **Comentarios** (entidad `Comment`, listar). Falta crear (POST) y, en su caso, like.
- [ ] **Progreso de visionado** → "Continúa viendo" (historial de usuario, hoy `continueWatching` va vacío).
- [x] **Contadores de vistas** (`ViewsLast7d`) → "Más vistos" (orden). Falta registrar vistas reales.
- [ ] **Stats de aprendizaje** (min, clips vistos, rankings) → Mi Juego.
- [ ] **Búsqueda** con filtros (tipo, nivel, duración) → Search.
- [x] **Mi Lista** (guardar/quitar) sobre clips **y** análisis — entidad `SavedItem` polimórfica + `SavedItemsController` (`/api/saved`, `/api/saved/ids`, `/api/saved/toggle`). Contrato front en `lib/api/saved.ts` + `SavedListResponse`. **Falta**: conectar `MiLista.tsx` y el botón en tarjetas/detalle (depende de auth, bloque 4).

**Subpasos nacidos (al implementar los 3 endpoints):**
- [ ] Crear la **migración inicial** y `database update`; verificar que el front recibe datos.
- [ ] **POST comentarios** y persistir **likes**/**Mi Lista** (requiere auth, bloques 4/7).
- [ ] **Historial de visionado** (tabla) para `continueWatching` y registro de vistas.
- [ ] Endpoints de **Explorar** (`/api/explore`) y **Resultados/Search** (`/api/results`).

### 6. Reproductor de vídeo real ⬜
Sustituir el placeholder por reproductor real: `<video>` propio + **hls.js** leyendo el `videoUrl` (`.m3u8`), embebido (sin links externos). Ver *Almacenamiento de vídeo y metadatos* arriba. Controles funcionales y salto por capítulos. Además (doc §6):
- [ ] **Selector de idioma de audio** + sonido/volumen.
- [ ] **Responsive del vídeo**: horizontal centrado en experiencia vertical (móvil), y pantalla completa 16:9 al girar el dispositivo, sin recortar ni deformar.
- [ ] **Guardado de progreso** (≥10s = iniciado, ≥90% = completado) para "Continúa viendo" y métricas.

### 8. Continuidad de consumo (autoplay) ⬜
Encadenar contenido relacionado (doc §9.7/§10.7):
- [ ] Desktop / pantalla completa: módulo "Siguiente en 3, 2, 1…" con cancelar/elegir otro.
- [ ] Móvil (no fullscreen): navegación vertical hacia el siguiente, con indicador "↓ Sigue aprendiendo".
- [ ] Prioridad: mismo concepto > mismo bloque (clips); conceptos/jugadores/torneo (análisis).

### 7. Mi Lista (guardar/quitar) en UI 🚧
- [x] **Store local de guardados** `lib/saved/store.ts` (fuente de verdad de la UI, persistido en localStorage; funciona sin backend). Cuando haya API, sincronizar con `/api/saved` es un cambio localizado.
- [x] **`SaveButton`** `lib/saved/SaveButton.tsx` reutilizable (variantes pill/icon) — selector guardar/quitar (§9.4).
- [x] **`MiLista.tsx` conectado** al store: clips y análisis guardados + empty state real (§12.5). Sin mock.
- [x] **Botones encendidos** en **Inicio** (Hero + tarjetas), **Explorar** (clips + análisis) y los **detalles** de Clip (§9.4, layout horizontal + rail vertical) y Análisis (§10.5).
- **Pendiente:**
  - [ ] "Gestionar lista" (seleccionar/borrar en masa) y "Vistos recientemente" (necesita historial).
  - [ ] Sustituir el store local por sincronización con `/api/saved` cuando el backend esté arriba.

### 9. Publicación de contenido + Cloudflare Stream 🚧
Vídeo en **Cloudflare Stream** (decidido). Patrón **Direct Creator Upload** (el token nunca sale del backend; el navegador sube directo a Cloudflare). El contrato del front no cambia: `videoUrl` = `.m3u8`, `thumbnailUrl`.
- [x] **Reproductor** `lib/player/VideoPlayer.tsx` (hls.js + HLS nativo Safari; controles; marcadores de capítulo). Probado en `/dev/player` con un vídeo real de Cloudflare Stream.
- [x] **Roles**: enum backend `User|Admin|ContentCreator`; el rol viaja en el JWT (`role`) y en `AuthResult`. Front: `canPublish()` (ContentCreator+Admin), gate `RequirePublisher`, dev-login con rol Admin.
- [x] **Página `/app/publicar`** (form de metadatos + selector de archivo), gateada por rol; enlace "Publicar" en el Header solo para publicadores.
- **Pendiente:**
  - [ ] Backend: opciones `CloudflareStream` + `CloudflareStreamService` (crear direct-upload, estado, construir URLs).
  - [ ] Backend: endpoints admin (`POST /api/admin/videos/direct-upload`, `POST /api/admin/{clips|analyses}`) con `[Authorize(Roles="Admin,ContentCreator")]`, + webhook "ready".
  - [ ] Modelo: `StreamUid` + `Status` en `Clip`/`Analysis` (deriva `videoUrl` del uid).
  - [ ] Front: conectar la subida real (Direct Creator Upload / tus) en `Publicar.tsx`.
  - [ ] Enchufar `VideoPlayer` en las páginas de Clip y Análisis.
  - [ ] **Fase 2**: signed URLs para contenido privado.

**Env vars del backend (host)** — Fase 1: `CloudflareStream__AccountId`, `CloudflareStream__ApiToken` 🔒, `CloudflareStream__CustomerSubdomain`, `CloudflareStream__WebhookSecret` 🔒. Fase 2: `CloudflareStream__SigningKeyId` 🔒, `CloudflareStream__SigningKeyPem` 🔒.
