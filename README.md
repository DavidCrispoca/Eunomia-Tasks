# Eunomia Tasks

Aplicación web de gestión de tareas, productividad personal y planificación del
tiempo. Inspirada en *Eunomia*, la diosa griega del orden y la disciplina.

**Fase actual:** MVP local con **borrador de autenticación** (modo demo local o
Supabase Auth) y persistencia en `localStorage` con una interfaz de datos
(`DataStore`) preparada para migrar a Supabase.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. La primera ejecución crea tareas y un bloque de
ejemplo para que puedas probar la app de inmediato. Sin variables de entorno,
**cualquier correo + contraseña (≥ 6 caracteres) funciona** en modo demo.

## Qué incluye esta fase

- **Inicio / Dashboard**: métricas (pendientes, completadas hoy, % a tiempo,
  vencidas), próximas fechas límite, enfoque semanal y próximos pasos.
- **Tablero Kanban**: tres columnas (Por hacer / En curso / Terminado) con
  arrastrar y soltar (`@dnd-kit`), reordenación, creación/edición de tareas,
  prioridades, notas y fechas límite.
- **Calendario semanal / Time-blocking**: reserva bloques de enfoque arrastrando
  tareas desde el panel "Sin programar" a la parrilla horaria (7:00–21:00),
  edición de bloques (horario, color, tarea vinculada).
- **Pomodoro**: sesiones de enfoque ajustables (10–60 min) por tarea desde su
  editor; al terminar el bloque puedes dejarla *En curso* o marcarla *Terminada*.
- **Paleta de comandos `Ctrl/Cmd + K`**: navegar, crear tarea, completar tareas,
  cambiar idioma.
- **Autenticación (borrador)**: login/registro, sesión firmada en cookie
  HttpOnly (`jose`), guard optimista en `proxy.ts`. Activa el modo Supabase
  definiendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **i18n Español/Inglés** y sistema visual nocturno obisidiana & oro ámbar
  (ver `DESIGN.md`): glassmorphism, gradientes de firma, tipografía Geist
  (mono para cifras y atajos).
- **Sincronización entre pestañas** del navegador (vía `localStorage` + eventos).

## Configuración (autenticación)

Copia `.env.example` a `.env.local` y rellena:

```bash
cp .env.example .env.local
```

| Variable                        | Descripción                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| `SESSION_SECRET`                | Firma de la sesión. Genera una con `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto (opcional; sin ambas, modo demo local)      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del proyecto (opcional)                             |

Sin Supabase configurado la app funciona en **modo demo**: cualquier correo y
contraseña crean una sesión local. Con Supabase, las credenciales se validan
contra Supabase Auth (el ajuste a la arquitectura Vercel se documenta en
`PLAN.md`).

## Estructura

```
src/
├── app/
│   ├── (auth)/                 # Login y registro (grupo de rutas público)
│   ├── (dashboard)/            # Layout con sidebar + topbar + paleta
│   │   ├── page.tsx            # Inicio / Resumen
│   │   ├── kanban/             # Página del tablero
│   │   ├── calendar/           # Página del calendario
│   │   └── pomodoro/[taskId]/  # Página del temporizador de enfoque
│   ├── layout.tsx              # Root layout (fuentes + providers + sesión)
│   └── proxy.ts                # Guard optimista de autenticación
├── components/
│   ├── auth/                   # AuthShell, AuthForm, LangSwitch
│   ├── dashboard/              # Vista Inicio (KPIs, deadlines, enfoque)
│   ├── kanban/                 # Tablero, columna, tarjeta, drag & drop
│   ├── calendar/               # Vista semanal, bloques, arrastre a la parrilla
│   ├── pomodoro/               # Temporizador: anillo, presets y fin de sesión
│   ├── command/                # Command palette (Cmd+K)
│   ├── layout/                 # Sidebar y topbar
│   └── ui/                     # Button, Modal, Input, Select, Logo, …
├── lib/
│   ├── auth/                   # Sesión (jose), cookies, provider, actions, supabase
│   ├── i18n/                   # Diccionarios es/en + provider
│   ├── storage/                # Interfaz DataStore + localStorage + useSynced
│   ├── date.ts                 # Utilidades de fecha (date-fns)
│   └── utils.ts                # Helpers (id, fechas ISO, orden)
├── providers/                  # Idioma, sesión, datos, UI (modales)
└── types/                      # Modelo de datos (Task, TimeBlock, AppUser)
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
2. **Auth — en curso:** el borrador actual (cookie firmada + `proxy.ts`) se
   ajustará a la arquitectura planeada: sustituir la sesión propia por la sesión
   de Supabase (`@supabase/ssr`, cookie par de sesión) y proteger los datos por
   usuario.
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