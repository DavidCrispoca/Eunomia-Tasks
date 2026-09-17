# Eunomia Tasks

Aplicación web de gestión de tareas, productividad personal y planificación del
tiempo. Inspirada en *Eunomia*, la diosa griega del orden y la disciplina.

**Fase actual:** MVP con backend real: autenticación Supabase, datos
multidispositivo en Postgres (RLS por usuario), alertas por correo (Resend) de
tareas por vencer, asistente de WhatsApp Business (briefing diario + comandos)
y sincronización con Google Calendar (OAuth2). Deploy preparado para Vercel
(ver `SETUP.md`).

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
- **Autenticación**: login/registro, sesión firmada en cookie HttpOnly (`jose`)
  que valida contra **Supabase Auth**; modo demo si no hay credenciales.
- **Datos multidispositivo**: al configurar Supabase, los datos viven en
  Postgres con RLS por usuario y se sincronizan entre dispositivos (al cargar,
  al ganar el foco y cada 30 s; escrituras optimistas).
- **Correo (Resend)**: máximo 1 correo/día con las tareas pendientes por vencer
  y enlaces firmados para **completar / posponer 24 h / añadir** sin login.
- **WhatsApp Business**: *Morning Briefing* diario a la hora local y comandos
  por chat (`añadir`, `completar <n>`, `listar`, `verificar <código>`).
- **Google Calendar**: conectar con OAuth2 y sincronizar los bloques de enfoque
  como eventos (Conexiones → Google Calendar).
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

| Variable                        | Uso                                                        |
| ------------------------------- | ---------------------------------------------------------- |
| `SESSION_SECRET`                | Firma de la cookie de sesión (`openssl rand -base64 32`)   |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto Supabase (backend de datos)               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key pública                                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role (solo servidor; nunca enviar al cliente)      |
| `RESEND_API_KEY`                | Envío de correos de tareas por vencer                      |
| `EMAIL_FROM`                    | Remitente verificado (`Eunomia Tasks <no-reply@dominio>`)  |
| `APP_URL`                       | URL pública para los enlaces firmados del correo           |
| `WHATSAPP_TOKEN`                | Token de sistema (Meta Cloud API)                          |
| `WHATSAPP_PHONE_ID`             | Phone Number ID del número de negocio                      |
| `WHATSAPP_VERIFY_TOKEN`         | Verify token del webhook                                   |
| `WHATSAPP_APP_SECRET`           | App Secret de Meta (firma de webhooks)                     |
| `GOOGLE_CLIENT_ID`              | OAuth client ID (Google Calendar)                          |
| `GOOGLE_CLIENT_SECRET`          | OAuth client secret                                        |
| `GOOGLE_REDIRECT_URI`           | Redirect URI autorizada                                    |
| `GOOGLE_CALENDAR_ID`            | `primary` por defecto                                      |
| `CRON_SECRET`                   | Protege los crons (la inyecta Vercel)                      |

## Estructura

```
src/
├── app/
│   ├── (auth)/                 # Login y registro
│   ├── (dashboard)/            # Inicio, kanban, calendar, pomodoro
│   └── api/                    # Route Handlers
│       ├── cron/               # due-soon (correo) y morning-briefing (WhatsApp)
│       ├── email/actions/      # Enlaces firmados (completar/posponer/añadir)
│       ├── whatsapp/           # webhook + vinculación
│       └── calendar/           # OAuth2 + sync
├── components/
│   ├── connect/                # Panel de conexiones (WhatsApp, Google)
│   └── auth/, dashboard/, kanban/, calendar/, pomodoro/,
│       command/, layout/, ui/
├── lib/
│   ├── supabase/               # config + cliente admin (server-only)
│   ├── data/                   # mappers, repo y server actions
│   ├── notify/                 # email (Resend), whatsapp, briefing, signed
│   ├── calendar/               # OAuth2 + sync Google Calendar
│   ├── whatsapp/               # parser de comandos
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