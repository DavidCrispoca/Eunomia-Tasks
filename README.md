# Eunomia Tasks

Aplicación web de gestión de tareas, productividad personal y planificación del
tiempo. Inspirada en *Eunomia*, la diosa griega del orden y la disciplina.

**Fase actual:** MVP local (sin backend). Persistencia en `localStorage` con una
interfaz de datos (`DataStore`) preparada para migrar a Supabase.

## Requisitos

- Node.js 20+ (probado con Node 24)
- npm

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La primera ejecución crea tareas y un bloque de
ejemplo para que puedas probar la app de inmediato.

## Qué incluye esta fase

- **Tablero Kanban**: tres columnas (Por hacer / En curso / Terminado) con
  arrastrar y soltar (`@dnd-kit`), reordenación, creación/edición de tareas,
  prioridades, notas y fechas límite.
- **Calendario semanal / Time-blocking**: reserva bloques de enfoque arrastrando
  tareas desde el panel "Sin programar" a la parrilla horaria (7:00–21:00),
  edición de bloques (horario, color, tarea vinculada).
- **Paleta de comandos `Ctrl/Cmd + K`**: navegar, crear tarea, completar tareas,
  cambiar idioma.
- **i18n Español/Inglés** y sistema visual nocturno obisidiana & oro ámbar
  (ver `DESIGN.md`): glassmorphism, gradientes de firma, tipografía Geist
  (mono para cifras y atajos).
- **Sincronización entre pestañas** del navegador (vía `localStorage` + eventos).

## Estructura

```
src/
├── app/
│   ├── (dashboard)/          # Layout con sidebar + topbar + paleta
│   │   ├── kanban/           # Página del tablero
│   │   └── calendar/         # Página del calendario
│   ├── layout.tsx            # Root layout (fuentes + providers)
│   └── page.tsx              # Redirige a /kanban
├── components/
│   ├── kanban/               # Tablero, columna, tarjeta, drag & drop
│   ├── calendar/             # Vista semanal, bloques, arrastre a la parrilla
│   ├── command/              # Command palette (Cmd+K)
│   ├── layout/               # Sidebar y topbar
│   └── ui/                   # Button, Modal, Input, Select, Logo, …
├── lib/
│   ├── i18n/                 # Diccionarios es/en + provider
│   ├── storage/              # Interfaz DataStore + localStorage + useSynced
│   ├── date.ts               # Utilidades de fecha (date-fns)
│   └── utils.ts              # Helpers (id, fechas ISO, orden)
├── providers/                # Idioma, datos, UI (modales)
└── types/                    # Modelo de datos (Task, TimeBlock)
```

## Cómo mantener el coste en $0

Las siguientes herramientas gratuitas soportan la hoja de ruta (fase 2):

| Servicio      | Uso                                   | Capa gratuita                              |
| ------------- | ------------------------------------- | ------------------------------------------ |
| Vercel        | Despliegue + API Routes + Cron        | Hobby (cron diario/semanal)                |
| Supabase      | Postgres + Auth (multi-dispositivo)   | 500 MB DB, 2 proyectos, auth free          |
| Resend        | Alertas por correo                    | 3.000 emails/mes                           |
| WhatsApp (Meta) | Morning briefing + comandos por chat | Gratis para 5 números de prueba            |
| Google Cloud  | Google Calendar API (OAuth2)          | Cuota gratuita                             |

## Hoja de ruta (fase 2, fuera del MVP local)

1. Sustituir `localStorageStore` por una implementación `DataStore` con Supabase
   (RLS por usuario) sin tocar la UI.
2. Auth (email/password) con Supabase Auth → acceso multidispositivo.
3. Sincronizar bloques con Google Calendar vía OAuth2.
4. Webhook de WhatsApp Business para comandos ("añadir x", "completar 1") y
   cron diario de *Morning Briefing*.
5. Despliegue en Vercel (Hobby) + variables de entorno en `.env.local` /
   Vercel Dashboard.

## Comandos útiles

```bash
npm run dev      # desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # ESLint (Next.js)
```