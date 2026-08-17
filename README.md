# Padel Film Room — Frontend

Plataforma de vídeo táctico de pádel: **clips** (cortos, un concepto) y **análisis/vídeos** (largos, con capítulos). Frontend en React + Vite contra el backend `PFR_API` (.NET 9).

> **Estado: MVP completo, en producción, fase beta.** Frontend en Netlify
> (`app.padelfilmroom.com`), backend en SmarterASP.NET (`api.padelfilmroom.com`), vídeo en
> Cloudflare Stream. Ver el roadmap más abajo para el detalle bloque a bloque, y
> [`docs/MAPA_PROYECTO.md`](docs/MAPA_PROYECTO.md) para orientarse rápido (rutas, despliegue,
> dónde está cada cosa).
>
> **Cómo se usa este README.** Es un **roadmap vivo**. Cada bloque grande lleva estado
> (✅ hecho · 🚧 en curso · ⬜ pendiente). **Al completar algo, se añaden debajo los
> subpasos que nacen de ese avance**, para tener siempre claro el siguiente camino.
>
> **Principio rector: el FRONTEND manda sobre el backend.** El frontend define el modelo y
> el contrato; el backend se **adapta** a lo que necesita la UI, **nunca al revés**.

---

## Stack
- **React 19 + TypeScript + Vite**, **React Router 7**, **Tailwind 3**, **lucide-react**.
- Data fetching con **hooks propios** (sin React Query). Sin providers globales. Caché
  stale-while-revalidate en `lib/hooks/useApi.ts`.
- Backend: **PFR_API** (.NET 9 + EF Core + SQL Server + JWT con roles) en `/Backend`,
  desplegado en SmarterASP.NET (despliegue **manual**, no vía `git push`).
- Vídeo: **Cloudflare Stream** (HLS adaptativo vía hls.js), con **URLs de reproducción
  firmadas** (JWT RS256, caducidad 6h) — el vídeo no es público, requiere sesión.

## Estructura del front
```
src/
├── App.tsx, main.tsx, index.css
├── app/router/router.tsx        # rutas (/ → /app/inicio), lazy() + guards + Suspense
├── lib/                         # capa de datos y utilidades compartidas
│   ├── config.ts                # API_BASE (VITE_API_URL)
│   ├── api/                     # client.ts (JSON/FormData/blob) + un módulo por dominio
│   ├── auth/                    # store de sesión, LoginPage, guards (RequireAuth/Publisher/Admin)
│   ├── hooks/useApi.ts          # fetch + caché stale-while-revalidate
│   ├── player/                  # VideoPlayer (hls.js), NextUp (autoplay)
│   ├── saved/                   # Mi Lista: store sincronizado con /api/saved + SaveButton
│   ├── search/recent.ts         # búsquedas recientes (localStorage, por dispositivo)
│   ├── share.ts, miJuegoStory.ts, format.ts, ui/ (BottomSheet, Skeleton…)
├── styles/theme.css             # bg-film-room
└── pages/App/
    ├── index.tsx                # AppLayout: Header + Outlet + MobileNav + FeedbackButton
    ├── components/               # Header, MobileNav, SearchOverlay, FilterPanel, FeedbackButton…
    └── pages/                    # Inicio, Explorar, Search, MiLista, MiJuego, ComoFunciona,
                                   # Watch/Clip/Video, Publicar, AdminInvites, AdminFeedback
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

## Backend real (PFR_API, .NET 9)
El backend fue reescrito por completo para servir el contrato que define el frontend
(endpoints "con forma de pantalla", modelo `ContentItem` unificado). Detalle completo de
endpoints en [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md). Piezas clave:

- **Taxonomía relacional**: `ClipConcept` (clip ↔ bloque ↔ concepto), permite que un mismo
  clip aparezca en varios bloques mostrando solo los conceptos relevantes de cada uno (§8.3/§14.4).
- **Auth con roles** (`User` / `Admin` / `ContentCreator`), JWT Bearer. Toda la app (`/app/*`)
  vive detrás de sesión.
- **Todos los endpoints de contenido y vídeo requieren auth** (`[Authorize]`) — no hay nada
  público, incluidas las URLs de vídeo (ver más abajo).
- **Migraciones las gestiona el usuario**, nunca Claude: solo se editan entidades +
  `ContextDb`, y se pide el comando `dotnet ef migrations add`.

## Vídeo (Cloudflare Stream) y seguridad

- El vídeo **no se guarda en SQL** ni en el frontend: la BD solo guarda el `uid` de
  Cloudflare Stream. `videoUrl` es el **manifiesto HLS** (`.m3u8`) que sirve Cloudflare.
- **Reproducción embebida**: `<video>` propio + **hls.js** (Safari reproduce HLS nativo).
  Nunca se sale de la app ni se enlaza a Cloudflare directamente.
- **URLs firmadas**: cada reproducción pide al backend una URL firmada (JWT RS256,
  `CloudflareStreamService.SignPlaybackUrl`) con **caducidad de 6 horas**. Sin sesión válida
  no hay forma de obtener ni reproducir el vídeo — cierra el hueco de vídeos públicos que
  cualquiera podía enlazar directamente si conocía el `uid`.
- **Publicación**: subida resumible (protocolo `tus`) directo del navegador a Cloudflare
  Stream desde `/app/publicar` (rol `Admin`/`ContentCreator`), sin pasar por el backend ni
  límite de 200 MB.

## Metadatos (bloques/conceptos)
- `concepts` se guarda como **CSV** (`TagsCsv`) y `block`/`players`/`tournament` como texto
  plano — suficiente para el volumen de contenido del MVP. El contrato del frontend ya usa
  arrays (`concepts: string[]`), así que si algún día migra a tablas relacionales de verdad,
  **no tocará el frontend**.
- El campo `level` ("Nivel") **se retiró** de filtros y taxonomía (no aportaba valor real al
  usuario) — sigue existiendo como campo opcional en el tipo `ContentItem` por compatibilidad,
  pero no se usa en ninguna UI.

---

## Roadmap (bloques grandes)

### Estado actual (agosto 2026)
El MVP descrito en `public/PFR_Requerimientos/Requerimientos funcionales MVP.rtf` está
**cruzado sección a sección con el código y prácticamente completo**, en producción, en
fase beta. Único hueco consciente: selector de idioma de audio (no hay contenido
multi-idioma todavía, así que no bloquea nada — hay un placeholder "Audio con IA ·
Próximamente" en el reproductor).

**Bloques 1–9 (más abajo): completos ✅.** Lo que queda no es código pendiente del MVP, sino
crecimiento: publicar más contenido, recoger feedback de la beta (`/app/admin/reportes`) y
decidir próximas iteraciones sobre datos reales de uso.

### 1. Base del front ✅
Todas las pantallas (Inicio, Explorar, Mi Lista, Mi Juego, Watch vídeo/clip, Search, Cómo
funciona, Publicar, paneles admin), navbar + `MobileNav` (5 iconos, incluye "Cómo
funciona"), navegación cruzada, URLs limpias con `?v=`/`?c=`. Responsive verificado pantalla
por pantalla en móvil/tablet/escritorio (Playwright).

### 2. Capa de datos ✅
`api/client` (JSON + `FormData` + blobs, JWT automático) + `api/types` + `hooks/useApi` con
caché **stale-while-revalidate**. Endpoints con forma de pantalla (BFF): `/api/home`,
`/api/explore`, `/api/search`, `/api/clips/{id}`, `/api/analyses/{id}`, modelo unificado
`ContentItem` (`type: clip | analysis`).

### 3. Pantallas de contenido ✅
- **Inicio** (`/api/home`): Hero, Continúa viendo, Nuevo esta semana, Conceptos populares, Más vistos.
- **Explorar** (`/api/explore`): bloques tácticos con conceptos en chip (filtran in-situ), análisis completos.
- **Search / Resultados** (`/api/search`): destino común de búsqueda, "Ver todo", conceptos y
  filtros globales (Tipo/Bloque/Concepto vía `FilterPanel`, compartido con Explorar).
  **Búsqueda de texto fuzzy** (Fuse.js, en cliente): tolera plurales y erratas, muestra
  resultados parecidos en vez de "sin resultados" ante un match no exacto.
- **Clip / Análisis** (`/app/watch`): reproductor, conceptos, "Aparece en", **capítulos**
  (v1 manual: minuto + título + concepto, desde Publicar), Me gusta, comentarios (bottom
  sheet en móvil), compartir, **autoplay** "Siguiente en 3, 2, 1…" con scroll vertical en móvil.
- **Buscador**: icono en el header (desktop) o overlay de pantalla completa con búsquedas
  recientes (móvil) — aterriza en `/app/search` solo al enviar, no mientras se escribe.
  Recientes persisten **por dispositivo** (localStorage); sincronizarlas entre dispositivos
  queda para el futuro.

### 4. Autenticación ✅
Toda la app (`/app/*`) vive detrás de sesión — pantalla puerta `/login`, no modal. JWT con
roles (`User`/`Admin`/`ContentCreator`). Store sin provider global (`useSyncExternalStore`).

### 5. Mi Lista, Me gusta, comentarios, historial ✅
- **Mi Lista** sincronizada con `/api/saved` (no solo local): guardar/quitar clips y
  análisis, "Vistos recientemente" (§12.4) y "Gestionar" (seleccionar/eliminar/vaciar, §12.1).
- **Me gusta** y **comentarios** (POST) funcionales en Clip y Análisis.
- **Historial de visionado**: guarda progreso, con los umbrales exactos del doc (§6) —
  iniciado > 10 s, completado ≥ 90 %. Alimenta "Continúa viendo" y Mi Juego.

### 6. Reproductor de vídeo (Cloudflare Stream) ✅
`<video>` propio + hls.js (HLS nativo en Safari), controles a medida, selector de calidad,
capítulos, **URLs de reproducción firmadas** (ver más arriba). Responsive: horizontal
centrado en vertical, pantalla completa vía botón (incluye el fallback de iOS Safari,
`webkitEnterFullscreen`, ya que no soporta `requestFullscreen` en iPhone).

### 7. Continuidad de consumo (autoplay) ✅
`lib/player/NextUp.tsx`: "Siguiente en 3, 2, 1…" cancelable (desktop / pantalla completa) e
indicador "↓ Sigue aprendiendo" con scroll vertical (móvil), priorizando mismo concepto y
luego mismo bloque.

### 8. Mi Juego ✅
Resumen de actividad (minutos, clips/análisis vistos), ranking de conceptos y bloques más
trabajados, y compartir resumen (imagen 9:16 — Instagram en móvil, descarga en escritorio).

### 9. Publicación de contenido ✅
`/app/publicar` (rol `Admin`/`ContentCreator`): subida resumible (`tus`) directa del
navegador a Cloudflare Stream, catálogo reutilizable de jugadores/sede/categoría/conceptos,
torneo estructurado, **capítulos** por análisis (v2 con scrubber del vídeo queda pendiente,
hoy es minuto escrito a mano).

### 10. Beta: feedback de usuarios ✅
Botón flotante de feedback (`FeedbackButton`) en toda la app: tipo (fallo/idea/otro),
mensaje, **captura de pantalla opcional** (dropzone, máx. 5 MB, guardada en SQL — se borra
sola 1 día después de que el reporte se marque resuelto). Panel de gestión en
`/app/admin/reportes` con historial, notas internas y miniatura/lightbox de la captura.
