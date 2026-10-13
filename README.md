# Eunomia Tasks

Aplicación de productividad personal para organizar tareas, planificar tiempo de
estudio y trabajo, y seguir el progreso con una capa ligera de gamificación.
Incluye interfaz en español e inglés, almacenamiento local para modo demo y
sincronización multidispositivo opcional con Supabase.

- **Producción:** [eunomia-tasks.vercel.app](https://eunomia-tasks.vercel.app)
- **Aplicación:** Next.js 16, React 19, TypeScript y Tailwind CSS 4
- **Diseño:** identidad Ink Surface + Brand Azure. Ver `src/app/globals.css`.

## Funciones

### Tareas y materias

- **Inicio:** pendientes, vencidas, tareas de hoy, bloques del día y próximas
  fechas límite.
- **Tablero Kanban:** tareas Por hacer, En curso y Terminadas; prioridad, notas,
  fecha y hora límite; filtros por materia, búsqueda, orden y arrastre entre
  columnas. En móvil se puede cambiar de columna con las pestañas superiores;
  el estado también se puede editar desde el detalle de cada tarea.
- **Materias:** crea y administra grupos, asigna tareas y compara el tiempo de
  concentración acumulado por materia.
- **Metas:** una tarea marcada como meta concede una recompensa adicional cuando
  se completa.
- **Calendario semanal:** organiza bloques de tiempo y mueve tareas a la semana.
  En móvil la cuadrícula conserva un ancho legible y se desplaza horizontalmente.
- **Paleta de comandos:** `Ctrl+K` o `⌘K` para buscar y navegar.

### Pomodoro y NFC

- **Pomodoro simple:** presets de 10, 15, 25, 30, 45 y 60 minutos; iniciar,
  pausar, reanudar y registrar enfoque en una tarea.
- **Pomodoro Vuelo:** calcula duraciones de vuelo entre 32 aeropuertos, con
  rutas sugeridas o selección de origen y destino.
- **Ambientes de audio:** tormenta, lluvia, bosque nocturno, cabina, cafetería,
  lofi, chimenea, ruido blanco y marrón; volumen ajustable.
- **Modos de actividad:** Focus/Enfoque, Work/Trabajo, Study/Estudio,
  Sleep/Sueño, Break/Descanso y Review/Revisión. Una tarjeta NFC puede iniciar o
  cerrar una sesión; el escaneo por sí solo no otorga recompensas.
- **Asignación opcional de materia:** las sesiones Focus y Study se pueden
  relacionar con una materia o dejar sin asignar. Sus minutos se suman al tiempo
  de la materia en el tablero, el inicio y el informe semanal.
- **Lectura NFC del navegador:** disponible en navegadores compatibles con Web
  NFC y contextos HTTPS. La escritura de tarjetas físicas puede hacerse con NFC
  Tools para Android.

### Mundo y progreso

- **XP, Euno Coins, niveles y logros** con concesión validada en el servidor.
- Recompensas por tareas completadas, metas, sesiones Focus válidas y revisión
  semanal. Las sesiones de enfoque tienen límites para evitar registros
  duplicados o irreales.
- **Mapa de islas/campaña**, informe semanal editable y celebraciones de
  progreso.
- **Mascotas:** Pegaso, Lechuza y Fénix; cada especie tiene solo las etapas Bebé
  y Adulto. Pegaso cuenta con `bebe.webp` y `adulto.webp`; Lechuza y Fénix usan
  el arte SVG de respaldo hasta que se incorporen sus cuatro archivos WebP.
  El arte se sirve con transparencia desde `public/assets/mascot/<especie>/`.

### Cuenta e integraciones

- **Inicio de sesión y registro** con Supabase Auth. `ALLOWED_EMAILS` restringe
  el acceso a las cuentas configuradas; sin esa lista no se aplica una
  restricción por correo. Sin credenciales de Supabase, el inicio local permite
  modo demo.
- **Datos en la nube:** Postgres con políticas RLS por usuario; el cliente no
  recibe la clave `service_role`. Sin Supabase, la app usa almacenamiento local
  del navegador y no sincroniza entre dispositivos.
- **Google Calendar:** conexión OAuth y sincronización de bloques; requiere
  credenciales propias de Google Cloud.
- **Avisos por correo:** resumen de tareas próximas a vencer y enlaces firmados
  para completar o posponer una tarea. Puede enviarse por SMTP o Resend. El
  cron diario de Vercel (13:15 UTC) está definido en `vercel.json`; la hora de
  envío se ajusta con `MAIL_HOUR` y la zona horaria de cada perfil.
- **URL de salud:** `/api/health` comprueba la presencia/configuración de
  integraciones sin devolver sus valores secretos.

## Requisitos

- Node.js **20.9 o posterior** y npm.
- Para modo local/demo: no hace falta una cuenta externa.
- Para cuentas y sincronización: proyecto Supabase configurado.
- Para calendario y correo: credenciales opcionales de Google y SMTP/Resend.

## Desarrollo local

```bash
npm install
Copy-Item .env.example .env.local   # PowerShell; en macOS/Linux: cp .env.example .env.local
npm run dev
```

Abre <http://localhost:3000>. Deja vacías las variables de Supabase para usar el
modo demo local. La información demo se guarda en el navegador y no se sincroniza
con la nube.

Comandos disponibles:

```bash
npm run dev             # servidor de desarrollo
npm run lint            # ESLint
npx tsc --noEmit        # comprobación de TypeScript
npm run build           # compilación de producción
npm run start           # servir la compilación
npm run remotion:studio # previsualizar las composiciones de celebración
```

Si Turbopack no consigue iniciar procesos CSS en el entorno local, usa el
compilador alternativo de Next:

```bash
npx next dev --webpack
npx next build --webpack
```

## Variables de entorno

Copia `.env.example` como `.env.local`. En Vercel, configura las variables en el
proyecto. Nunca publiques `.env.local`, tokens de tarjetas NFC ni claves de
servidor.

| Variable | Necesidad | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Para nube | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Para nube | Clave pública/anon de Supabase; las tablas deben tener RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Para nube | Acceso de servidor; mantenerla secreta |
| `SESSION_SECRET` | Producción | Firma de cookies de sesión; usa una cadena aleatoria larga |
| `ALLOWED_EMAILS` | Opcional | Correos autorizados separados por coma |
| `APP_URL` | Producción | Origen público, por ejemplo `https://eunomia-tasks.vercel.app` |
| `GOOGLE_CLIENT_ID` | Opcional | Cliente OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | Opcional | Secreto OAuth de Google |
| `GOOGLE_TOKEN_SECRET` | Opcional | Secreto para cifrar tokens OAuth guardados |
| `SMTP_HOST` | Opcional | Servidor SMTP |
| `SMTP_PORT` | Opcional | Puerto SMTP; valor predeterminado `465` |
| `SMTP_SECURE` | Opcional | `false` para conexión SMTP sin TLS implícito |
| `SMTP_USER` | Opcional | Usuario SMTP |
| `SMTP_PASS` | Opcional | Contraseña SMTP o contraseña de aplicación |
| `RESEND_API_KEY` | Opcional | Alternativa de envío por Resend |
| `EMAIL_FROM` | Opcional | Remitente verificado para SMTP/Resend |
| `MAIL_HOUR` | Opcional | Hora local de envío, de `0` a `23`; predeterminado `8` |
| `CRON_SECRET` | Recomendado en producción | Protege la ruta de cron de tareas próximas a vencer |

Configura SMTP **o** Resend junto con `EMAIL_FROM` para habilitar correo. La
integración de Google requiere las tres variables `GOOGLE_*` y registrar como
URI de retorno `<APP_URL>/api/google/oauth/callback` en Google Cloud Console.

## Configurar Supabase

1. Crea un proyecto Supabase y configura las variables de nube descritas arriba.
2. Ejecuta `supabase/schema.sql` en el SQL Editor para crear el esquema base y
   sus políticas de seguridad.
3. Ejecuta, en orden, todos los archivos SQL de `supabase/migrations/` por su
   prefijo de fecha. La migración
   `20261012210000_activity_session_subject.sql` agrega la relación de sesiones
   Focus/Study con materias y es necesaria para esa función.
4. Habilita la autenticación por email en Supabase y configura las URLs de
   retorno de login/registro para los dominios local y de producción.
5. En producción, configura `SESSION_SECRET`, `APP_URL` y, si usas cron,
   `CRON_SECRET`.

Las mutaciones de XP, monedas, sesiones NFC y datos de usuario se validan en el
servidor. No uses la clave `service_role` en el navegador.

## Tarjetas NFC

Cada URL resuelve un token secreto de `public.nfc_tags` a un modo. Crea una fila
desde un proceso seguro de administración o desde el SQL Editor de Supabase:

```sql
insert into public.nfc_tags (token, mode_code, label)
values ('<TOKEN_ALEATORIO>', 'study', 'Study Mode');
```

`mode_code` admite `focus`, `work`, `study`, `sleep`, `break` y `review`. Usa un
token aleatorio nuevo por tarjeta. En NFC Tools para Android:

1. Elige **Write → Add a record → URL/URI**.
2. Escribe `https://<tu-dominio>/scan/<TOKEN_ALEATORIO>`.
3. Pulsa **Write** y acerca una tarjeta NFC compatible.
4. Abre la URL con el teléfono autenticado para iniciar/cerrar la sesión.

No uses `localhost` en una tarjeta que se leerá desde el teléfono: `localhost`
apunta al propio teléfono. Para probar en producción usa el dominio HTTPS
público. Mantén los tokens fuera del código, capturas y commits públicos. Para
desactivar una tarjeta:

```sql
update public.nfc_tags set active = false where token = '<TOKEN_ALEATORIO>';
```

## Rutas principales

| Ruta | Contenido |
| --- | --- |
| `/login`, `/register` | Acceso y registro |
| `/` | Resumen diario |
| `/kanban` | Tareas y materias |
| `/calendar` | Calendario semanal y bloques |
| `/pomodoro` | Modos de actividad/NFC |
| `/pomodoro/[taskId]` | Temporizador para una tarea |
| `/world` | Niveles, logros, islas, mascota e informe semanal |
| `/scan/[token]` | Activar o cerrar el modo ligado a una tarjeta NFC |
| `/add?t=...` | Añadir tarea con enlace firmado recibido por correo |
| `/api/health` | Estado no secreto de integraciones |

## Diseño responsive y accesibilidad

- Barra lateral en escritorio y navegación inferior en pantallas pequeñas, con
  zona segura para dispositivos con *notch*.
- Controles táctiles de al menos 44 px; el calendario y los filtros de materias
  pueden desplazarse cuando el contenido requiere más ancho.
- Diálogos con desplazamiento propio en pantallas bajas/pequeñas; los botones y
  selectores deben seguir accesibles sin salir del viewport.
- Foco visible por teclado y animaciones reducidas cuando el sistema activa
  `prefers-reduced-motion`.
- Las mascotas usan WebP con canal alfa para evitar fondos opacos y conservar
  descargas ligeras. Mantén dos archivos por especie: `bebe.webp` y
  `adulto.webp`.

## Estructura del proyecto

```text
src/app/                 Rutas, layouts y endpoints API
src/components/          UI de tareas, calendario, NFC, Pomodoro y mundo
src/lib/                 Auth, datos, Supabase, gamificación, NFC y utilidades
src/providers/           Estado compartido de la app
src/remotion/            Composiciones de celebraciones
public/assets/mascot/    Arte WebP de las mascotas
supabase/schema.sql      Esquema base y políticas RLS
supabase/migrations/     Cambios versionados del esquema
```

## Verificación antes de publicar

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Revisa además las rutas en un navegador móvil y de escritorio; el arrastre del
Kanban se realiza con ratón en escritorio y el cambio de estado sigue disponible
desde el formulario de tarea en móvil.
