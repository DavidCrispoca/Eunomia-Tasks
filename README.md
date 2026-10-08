# Eunomia Tasks

Aplicación web de gestión de tareas, productividad personal y planificación del
tiempo. Inspirada en *Eunomia*, la diosa griega del orden y la disciplina.

**Fase actual:** **Desplegada en producción** (`https://eunomia-tasks.vercel.app`).
MVP con backend real: autenticación Supabase (email/password con correos
autorizados), datos multidispositivo en Postgres (RLS por usuario) y alertas por
correo de tareas por vencer. Ver `SETUP.md` (incluye una sección de **diagnóstico en
producción** con el endpoint `/api/health`, que también expone el estado del correo:
bloque `email` con `smtpConfigured`/`smtpHost`/`smtpUser`/`smtpPass`/`sender`/`resend`/`mailHour`).

> ℹ️ **Estado del correo (22/09/2026):** el código de envío está listo, pero aún no
> llegan correos hasta que se rellenen las credenciales SMTP (`SMTP_USER`/`SMTP_PASS`/
> `EMAIL_FROM`) en Vercel — lo confirma `smtpConfigured:false` en `/api/health`.
> Pasos exactos en `PROCESO.md` (22-09) y `SETUP.md` (§4.1 y §8).

## Qué incluye

- **Inicio / Dashboard**: métricas (pendientes, completadas hoy, % a tiempo,
  vencidas), próximas fechas límite, enfoque semanal y próximos pasos.
- **Tablero Kanban**: tres columnas con arrastrar y soltar (`@dnd-kit`),
  reordenación, creación/edición, prioridades, notas y fechas límite.
- **Calendario semanal / Time-blocking**: bloqueos arrastrando tareas desde el
  panel "Sin programar" a la parrilla (00:00–24:00).
- **Pomodoro**: sesiones de enfoque ajustables por tarea con dos modos:
  **Simple** (presets 10–60 min) y **Vuelo** (duración de vuelos reales entre
  32 aeropuertos, por minutos con rutas recomendadas o eligiendo origen/destino)
  e **sonido ambiente** regulable (motor / lluvia / ruido blanco, volumen).
- **Enfoque medido por Clase**: cada sesión registra los minutos enfocados en la
  tarea; las tarjetas muestran su acumulado y tanto el tablero como el resumen
  calculan el **total y el ranking por clase** (🔥 en la clase más enfocada).
- **Paleta de comandos `Ctrl/Cmd + K`**.
- **Diseño totalmente responsive móvil**: en pantallas pequeñas la navegación pasa a
  una **barra inferior fija** (Inicio / Tablero / Calendario + botón central "Nueva
  tarea" con `safe-area-inset-bottom`); el **menú de cuenta** se muestra en la esquina
  superior derecha (avatar, nombre, email, badge demo y logout) y
  todos los controles táctiles miden ≥ 44px.
- **Autenticación**: login/registro con **email/password** (solo correos de
  `ALLOWED_EMAILS`), sesión firmada en cookie HttpOnly (`jose`) que valida contra
  **Supabase Auth**; modo demo si no hay credenciales.
- **Datos multidispositivo**: al configurar Supabase, los datos viven en
  Postgres con RLS por usuario y se sincronizan entre dispositivos (al cargar,
  al ganar el foco y cada 30 s; escrituras optimistas). La nube solo se
  **persiste tras mutaciones reales** y tiene candados anti-pérdida: una cuenta
  vacía o con solo tareas de semilla **nunca pisa** los datos locales reales, y
  `replaceAllForUser` aborta un reemplazo que intente sobrescribir datos reales
  con la semilla de arranque.
- **Correo (Gmail SMTP o Resend)**: máximo 1 correo/día con las tareas pendientes
  por vencer, resumen semanal los lunes, y enlaces firmados para **completar /
  posponer 24 h / añadir** sin login. *Requiere las variables SMTP en Vercel para
  enrutar (ver `SETUP.md` §4.1).*
- **Playwright E2E**: `scripts/e2e.mjs` automatiza pruebas con Chrome del sistema
  u OperaGX (health / login / enlace firmado `/add` / Gmail).
- **Sistema visual "Ink Surface + Brand Azure"** (`DESIGN.md`): tema oscuro sobrio,
  superficies sólidas con jerarquía (`surface`/`raised`/`chip`), marca azul
  `#3E6AE0` para acciones y navegación activa, botones `rounded-[10px]`, números
  tabulares en métricas y transiciones animadas entre páginas y modales, siempre
  respetando `prefers-reduced-motion`.
- **i18n Español/Inglés**.

## Trabajo pendiente

> Detalle de cada punto en `SESSION-NOTES.md` (local, no se versiona).

- **[ ] Revisar los sonidos del Pomodoro a fondo.** Los ocho ambientes
  (`cabin`, `rain`, `white`, `brown`, `lofi`, `coffee`, `fireplace`) ya
  reproducen y el bug de `green` está corregido, pero **no se ha evaluado la
  calidad ni la mezcla**: falta comprobar que no saturan, que los loops no
  tienen clicks audibles en los empalmes y que los niveles son comparables
  entre sonidos. Revisar también que la mezcla con la música de Spotify no
  sature.
- **[ ] Arreglar el selector de idioma.** Preexistente y **no** causado por el
  gate de hidratación: se verificó revirtiendo el commit con `git stash` y el
  fallo persiste igual. Escribe `eunomia:lang` en `localStorage` y notifica
  correctamente, pero la interfaz sigue en español tras recargar.
- **[ ] Probar el arrastre entre columnas en móvil.** A 390 px solo cabe una
  columna y dnd-kit no hace auto-scroll horizontal, así que el destino queda
  fuera de pantalla. En escritorio está verificado en ambos sentidos.
- **[ ] Considerar un hook de hidratación compartido** en lugar del
  `useHydrated` local duplicado entre `pomodoro-chip.tsx` y la capa de
  storage.

## Estructura

```
src/
├── app/
│   ├── (auth)/                 # Login y registro
│   ├── (dashboard)/            # Inicio, kanban, calendar, pomodoro
│   └── api/                    # Route Handlers
│       ├── health/             # GET /api/health: diagnóstico de variables + estado del correo (sin secretos)
│       ├── cron/               # due-soon (correo)
│       ├── email/add/          # Añadir tarea por enlace firmado
│       └── email/actions/      # Enlaces firmados (completar/posponer/añadir)
├── components/
│   ├── layout/                 # topbar, sidebar, account-menu, mobile-nav
│   └── auth/, dashboard/, kanban/, calendar/, pomodoro/,
│       command/, ui/
├── lib/
│   ├── supabase/               # config + cliente admin (server-only)
│   ├── data/                   # mappers, repo y server actions
│   ├── flight/                 # Motor de vuelo del Pomodoro: flight.ts, airports.json, audio.ts
│   ├── notify/                 # email (SMTP/Resend), due-soon, signed
│   ├── cron/                   # guard de invocaciones de cron
│   ├── auth/, i18n/, storage/, date.ts, constants.ts, utils.ts
├── providers/                  # Idioma, sesión, datos, UI
└── types/                      # Task, TimeBlock, AppUser, Language
src/proxy.ts                    # Middleware (Next 16)
scripts/e2e.mjs                 # Playwright E2E (health/login/add/gmail; Chrome/OperaGX)
supabase/schema.sql             # Esquema + RLS
vercel.json                     # Cron due-soon
```

## Comandos útiles

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint (Next.js)
```

