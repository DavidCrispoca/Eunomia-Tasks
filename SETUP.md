# Setup de Eunomia Tasks — Cuentas, Variables y Deploy

Runa de configuración de principio a fin para llevar Eunomia Tasks a producción
con **coste $0** sobre la capa gratuita de cada servicio.

> El código ya está preparado: todo se desactiva solo si falta su variable de
> entorno. Sin variables, la app funciona en **modo demo local** (localStorage).

---

## 1. Qué necesitas (resumen)

| Servicio | Para qué | Capa gratuita | Cuentas necesarias |
| -------- | -------- | -------------- | ------------------ |
| **Supabase** | Postgres + datos multidispositivo + RLS | 2 proyectos, 500 MB | Sí (crear) |
| **Vercel** | Hosting, API Routes y Cron jobs | Hobby (2 crons) | Sí (crear) |
| **Resend** | Correo de tareas por vencer | 3.000 emails/mes, 100/día | Sí (crear) |
| **Meta (WhatsApp Business)** | Briefing diario + comandos por chat | Número de prueba gratis | Sí (ya la tienes) |
| **Google Cloud** | Google Calendar (OAuth2) | Cuota gratuita | Sí (crear) |
| **GitHub (opcional)** | Repo del proyecto para importar en Vercel | Gratis | Sí (crear) |

Tiempo estimado: **45–75 minutos** en total.

---

## 2. Supabase (base de datos + auth)

1. Crea una cuenta en https://supabase.com → **New project**.
   - Nombra el proyecto (p. ej. `eunomia-tasks`).
   - Elige contraseña de la base de datos y una región cercana (usa **free plan**).
2. Espera a que provisione (~1–2 min). En **Dashboard → Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (¡es secreta! nunca en el cliente)
3. **Crear el esquema**: abre **SQL Editor → New query**, pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   - Crea `profiles`, `tasks`, `time_blocks`, `user_prefs`, `notifications`,
     `google_tokens` y `whatsapp_verifications`, con **RLS habilitado** y un
     trigger que crea el perfil automáticamente al registrarse.
4. **Auth** → en **Authentication → Providers**, deja habilitado **Email**.
   - **URL Configuration**:
     - `Site URL`: la URL de tu app (al inicio `http://localhost:3000`; después el dominio de Vercel).
     - `Redirect URLs`: añade `http://localhost:3000/**` y `https://tu-app.vercel.app/**`.
   - Sin email de confirmación por ahora (recomendado para el MVP): en
     **Providers → Email**, desactiva *Confirm email*. Si lo activas, configura
     un SMTP custom (p. ej. el de Resend) o los correos de confirmación saldrán
     desde Supabase.
5. **Verificación**: desde la terminal

   ```bash
   npm run dev
   ```

   Regístrate en `http://localhost:3000/register` → crea tareas → vuelve a
   entrar por otra pestaña/dispositivo y los datos deben aparecer.

---

## 3. Vercel (despliegue + cron)

1. Crea cuenta en https://vercel.com (puedes entrar con GitHub).
2. **Add New → Project** → importa el repositorio de Eunomia Tasks.
   - Preset **Next.js** (se detecta automáticamente). Todo el `build` ya está probado.
3. En **Settings → Environment Variables**, añade **todas** las variables de la
   tabla de la sección 7 (más las que obtengas en los pasos 4–6).
4. **Deploy**. Cuando termine tendrás una URL `https://tu-app.vercel.app`.
5. Actualiza en Supabase (**Auth → URL Configuration**):
   - `Site URL` y `Redirect URLs` con el dominio real de Vercel.
6. **Cron jobs** (ya declarados en `vercel.json`, gratis en Hobby):
   - `0 * * * *` → `/api/cron/due-soon`: correos de tareas por vencer (máx. 1/día por usuario).
   - `0 * * * *` → `/api/cron/morning-briefing`: briefing de WhatsApp a la hora local de cada usuario.
   - Revisa que aparezcan en **Settings → Cron Jobs** tras el deploy.
   - `CRON_SECRET` (ver sección 7) protege ambos endpoints fuera de Vercel.

---

## 4. Resend (correo de tareas por vencer)

1. Crea cuenta en https://resend.com.
2. **Add Domain** → introduce el dominio propio que vas a usar para enviar
   (ej. `tudominio.com`). Resend te da 4 registros DNS:
   - 1 registro `TXT` de verificación de dominio.
   - Registros se recomienda añadir también **DKIM** (`TXT`/`CNAME`) y **SPF** (`TXT` MX).
   - Añádelos en tu proveedor DNS y espera a que se verifique (minutos–horas).
3. **API Keys → Create** (key solo en servidor) → `RESEND_API_KEY`.
4. El **remitente** debe ser de tu dominio verificado, p. ej.:
   `Eunomia Tasks <no-reply@tudominio.com>` → variable `EMAIL_FROM`.

> Límites gratis: 3.000 emails/mes, **100/día**, 1 dominio. La app envía como
> máximo **1 correo diario por usuario**, así que va sobrado.

### Probar el correo localmente

```bash
# Fuerza el envío de correos por vencer (exige RESEND_API_KEY + EMAIL_FROM configurados)
curl -s "http://localhost:3000/api/cron/due-soon"
```

---

## 5. WhatsApp Business (Meta Cloud API) — Briefing + comandos

Ya tienes la cuenta de WhatsApp Business con un número propio. Falta conectarla
a la Meta Cloud API.

### 5.1 Crear la app y obtener credenciales

1. Entra en https://developers.facebook.com → **My Apps → Create App**.
   - Tipo: **Business**.
   - Añade el producto **WhatsApp**.
2. **WhatsApp → Getting Started**:
   - Elige el **número de tu negocio** (el que ya tienes) o usa el **test number** que
     Meta te da gratis (sirve para probar con hasta 5 números).
   - Copia el **Phone Number ID** → variable `WHATSAPP_PHONE_ID`.
3. **App Settings → Basic** copia el **App Secret** → `WHATSAPP_APP_SECRET`.
4. Crea un **token de sistema** de larga duración:
   - **App Settings → Advanced → System User** → añade un usuario de sistema
     con permiso de *Besides* → **Generate Token** → permiso `whatsapp_business_messaging`.
   - Copia el token → `WHATSAPP_TOKEN`.

### 5.2 Configurar el webhook (recibir mensajes)

En **WhatsApp → Configuration**:

- **Callback URL**: `https://tu-app.vercel.app/api/whatsapp/webhook`
- **Verify token**: escribe un valor cualquiera, p. ej. `eunomia-verify-2026`
  → `WHATSAPP_VERIFY_TOKEN`.
- **Webhook fields**: suscríbete al evento **`messages`** (el que entrega
  `messages`/`statuses`).

### 5.3 Probar el flujo completo

1. En la app: **Conexiones → WhatsApp** → introduce tu número (formato intl,
   ej. `+52 1 55 1234 5678`) → **Enviar código**.
2. Desde ese número de WhatsApp escríbele al número del negocio:
   `verificar 123456` (el código que muestra la app).
3. A partir de ahí funciona:
   - ☀️ **Briefing diario** automático (hora local configurable, por defecto 09:00).
   - 📝 `añadir <título>` — crea una tarea.
   - ✅ `completar <n>` — completa la tarea n de tu lista.
   - 📋 `listar` — pendientes numerados.

> Nota: el número **destinatario** debe ser un número de WhatsApp real.
> Con el *test number* de Meta solo puedes enviar a los números que configures
> como permitidos en **WhatsApp → Getting Started** (hasta 5).

### Probar el webhook localmente

```bash
# Verificación del webhook (devuelve el challenge)
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"
```

---

## 6. Google Calendar (OAuth2)

1. En https://console.cloud.google.com:
   - **Nuevo proyecto** (ej. `eunomia-calendar`).
   - **APIs & Services → Library** → busca **Google Calendar API** → **Enable**.
   - **OAuth consent screen** → crea la pantalla de consentimiento (External).
     - En modo *Testing* solo podrán conectarse las cuentas que añadas como
       *Test users*; para producción publica la app (Application → Publish).
   - **Credentials → Create Credentials → OAuth client ID** → tipo **Web application**:
     - **Authorized redirect URIs**:
       - `http://localhost:3000/api/calendar/oauth/callback`
       - `https://tu-app.vercel.app/api/calendar/oauth/callback`
2. Copia **Client ID** (`GOOGLE_CLIENT_ID`) y **Client Secret**
   (`GOOGLE_CLIENT_SECRET`).
3. En la app: **Conexiones → Google Calendar → Conectar** → autorizas →
   **Sincronizar ahora**.
   - Cada vez que reserves bloques en el calendario de Eunomia, pulsa
     *Sincronizar* para reflejarlos como eventos en Google Calendar (con marca
     `Eunomia Tasks · time-block` para poder actualizarlos/limpiarlos).

---

## 7. Variables de entorno (tabla)

Local: copia `.env.example` → `.env.local`. En **Vercel → Settings → Environment Variables** lo mismo.

| Variable | Obligatoria | Descripción |
| -------- | :---------: | ----------- |
| `SESSION_SECRET` | ✅ | Firma de la cookie de sesión. `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ (prod) | Project URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ (prod) | Anon key pública |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (prod) | Service role (solo servidor) |
| `RESEND_API_KEY` | para correo | Key de servidor de Resend |
| `EMAIL_FROM` | para correo | `Eunomia Tasks <no-reply@tudominio.com>` |
| `APP_URL` | para correo | URL pública (`https://tu-app.vercel.app`) para enlaces firmados |
| `WHATSAPP_TOKEN` | para WhatsApp | Token del system user (Meta) |
| `WHATSAPP_PHONE_ID` | para WhatsApp | Phone Number ID del número de negocio |
| `WHATSAPP_VERIFY_TOKEN` | para WhatsApp | Tu token de verificación del webhook |
| `WHATSAPP_APP_SECRET` | para WhatsApp | App Secret de Meta |
| `GOOGLE_CLIENT_ID` | para Calendar | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | para Calendar | OAuth client secret |
| `GOOGLE_REDIRECT_URI` | para Calendar | URI autorizada (local o Vercel) |
| `GOOGLE_CALENDAR_ID` | para Calendar | `primary` (calendario principal) |
| `CRON_SECRET` | para cron | La pone Vercel automáticamente; úsala para llamadas manuales con `Authorization: Bearer` |

> En producción, `CRON_SECRET` y `WHATSAPP_APP_SECRET` añaden una capa más de
> seguridad: sin ellos los endpoints siguen protegidos solo por
> `x-vercel-cron`/firma de webhook.

---

## 8. Puesta en marcha rápida

```bash
npm install
cp .env.example .env.local   # completa las variables
npm run dev                  # prueba en local
```

Antes de hacer commit del deploy, comprueba:

```bash
npm run lint
npm run build
```

---

## 9. Pruebas recomendadas tras el deploy

| Prueba | Cómo |
| ------ | ---- |
| Login en 2 dispositivos | Registrarse en el móvil y el PC con la misma cuenta → los datos se ven en ambos |
| Correo de vencimiento | Crea una tarea con fecha límite = hoy, sin completar, y llama al cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://tu-app.vercel.app/api/cron/due-soon` |
| Enlace firmado del correo | Pulsa **Completar** en el correo → la tarea se marca `done` sin login |
| Vinculación WhatsApp | Conexiones → WhatsApp → código → texto `verificar <código>` → responder `listar`, `añadir …`, `completar <n>` |
| Briefing diario | Ajusta la hora en `user_prefs.briefing_time` y llama al cron del briefing para que se dispare en esa hora local |
| Google Calendar | Conectar → reservar un bloque → **Sincronizar ahora** → el evento aparece en Google Calendar |

---

## 10. Notas, límites y pendientes de mejora

- **Vercel Hobby**: máximo **2 crons** y frecuencia mínima **1 vez/hora**. Por eso
  el briefing se ejecuta cada hora y comprueba la hora local de cada usuario
  (por defecto 09:00), con deduplicación diaria en la tabla `notifications`.
- **Sincronización entre dispositivos**: la app usa *pull* (al cargar, al ganar
  el foco y cada 30 s) + escrituras optimistas. No usa Supabase Realtime todavía.
- **Correo «añadir tarea»**: el enlace firmado abre la app con el asistente de
  creación (`/?quickadd=1`). "Responder al correo para crear tareas" necesita un
  servicio de *email entrante* (p. ej. Cloudflare Email Routing) y queda como mejora.
- **Google Calendar**: sync **push** de bloques → eventos (crear/actualizar/borrar
  los marcados). El *pull* bidireccional (eventos → bloques) queda como mejora.
- **Envío saliente de WhatsApp**: con un número de producción, los mensajes de
  servicio requieren plantillas aprobadas por Meta. El flujo actual evita
  depender de plantillas porque el usuario **inicia el chat** primero (ventana
  de 24 h), y la vinculación/envío se hace por mensajes de respuesta.
- **Tokens de Google**: el `refresh_token` se guarda en `google_tokens`
  (privada por RLS). Para más capas de seguridad se podría cifrar con pgcrypto.
- **Semillas**: un usuario nuevo recibe las tareas de ejemplo automáticamente la
  primera vez que se conecta a Supabase.