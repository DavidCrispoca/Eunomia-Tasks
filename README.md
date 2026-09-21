# Eunomia Tasks

Aplicación web de gestión de tareas, productividad personal y planificación del
tiempo. Inspirada en *Eunomia*, la diosa griega del orden y la disciplina.

**Fase actual:** **Desplegada en producción** (`https://eunomia-tasks.vercel.app`).
MVP con backend real: autenticación Supabase (email/password con correos
autorizados), datos multidispositivo en Postgres (RLS por usuario) y alertas por
correo de tareas por vencer. Ver `SETUP.md` (incluye una sección de **diagnóstico en
producción** con el endpoint `/api/health`).

## Ejecutar en local

```bash
npm install
cp .env.example .env.local   # rellena las variables
npm run dev
```

Abre http://localhost:3000. **Sin variables de entorno** la app funciona en
**modo demo local**: cualquier correo + contraseña (≥ 6 caracteres) sirve y los
datos se guardan en `localStorage`.

## Qué incluye

- **Inicio / Dashboard**: métricas (pendientes, completadas hoy, % a tiempo,
  vencidas), próximas fechas límite, enfoque semanal y próximos pasos.
- **Tablero Kanban**: tres columnas con arrastrar y soltar (`@dnd-kit`),
  reordenación, creación/edición, prioridades, notas y fechas límite.
- **Calendario semanal / Time-blocking**: bloqueos arrastrando tareas desde el
  panel "Sin programar" a la parrilla (7:00–21:00).
- **Pomodoro**: sesiones de enfoque ajustables (10–60 min) por tarea.
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
  al ganar el foco y cada 30 s; escrituras optimistas).
- **Correo (Gmail SMTP o Resend)**: máximo 1 correo/día con las tareas pendientes
  por vencer, resumen semanal los lunes, y enlaces firmados para **completar /
  posponer 24 h / añadir** sin login.
- **i18n Español/Inglés** y sistema visual nocturno obsidiana & oro ámbar
  (ver `DESIGN.md`).

## Documentación

- **`SETUP.md`** — Runbook paso a paso para crear las cuentas, rellenar las
  variables y hacer el deploy en Vercel (todo en la capa gratuita).
- **`PLAN.md`** — Especificación, estado de implementación y hoja de ruta.
- **`supabase/schema.sql`** — Esquema de base de datos (ejecutar en el SQL
  Editor de Supabase).

## Variables de entorno

Copia `.env.example` a `.env.local`. Sin variables → modo demo local.

> En Vercel, las variables `NEXT_PUBLIC_*` se inyectan **al compilar**: si las
> añades/cambias debes hacer **redeploy**. Verifica el estado con
> `GET /api/health` (ver `SETUP.md` → 5.1).

| Variable                               | Uso                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `SESSION_SECRET`                       | Firma de la cookie de sesión (`openssl rand -base64 32`)                  |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase (backend de datos)                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Anon key pública                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`            | Service role (solo servidor; nunca enviar al cliente)                     |
| `RESEND_API_KEY`                       | Envío por Resend (usado solo si no hay SMTP)                              |
| `EMAIL_FROM`                           | Remitente (`Eunomia Tasks <no-reply@dominio>`; con Gmail = `SMTP_USER`)   |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Envío por SMTP si está configurado (p. ej. `smtp.gmail.com` / `465` / `true`); gana sobre Resend |
| `SMTP_USER` / `SMTP_PASS`              | Gmail con 2FA + «Contraseña de aplicaciones»                              |
| `MAIL_HOUR`                            | Hora local (0–23) del envío diario (default 8; los lunes, resumen semanal)|
| `APP_URL`                              | URL pública para los enlaces firmados del correo                          |
| `CRON_SECRET`                          | Protege el cron (debe tener valor no vacío)                               |

## Estructura

```
src/
├── app/
│   ├── (auth)/                 # Login y registro
│   ├── (dashboard)/            # Inicio, kanban, calendar, pomodoro
│   └── api/                    # Route Handlers
│       ├── health/             # GET /api/health: diagnóstico de variables (sin secretos)
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
│   ├── notify/                 # email (SMTP/Resend), due-soon, signed
│   ├── cron/                   # guard de invocaciones de cron
│   ├── auth/, i18n/, storage/, date.ts, constants.ts, utils.ts
├── providers/                  # Idioma, sesión, datos, UI
└── types/                      # Task, TimeBlock, AppUser, Language
src/proxy.ts                    # Middleware (Next 16)
supabase/schema.sql             # Esquema + RLS
vercel.json                     # Crons
```

## Comandos útiles

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint (Next.js)
```