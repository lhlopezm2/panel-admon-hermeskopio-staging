# Panel de Administración — Hermeskopio

Panel web estático (React + Vite + TypeScript + Tailwind) para que un
administrador revise los reportes acumulados sobre un negocio y decida
bloquearlo/desbloquearlo. Se autentica contra el mismo proyecto Supabase de
la app Hermeskopio — un admin es una cuenta normal (`personas`/Supabase
Auth) que además tiene una fila en la tabla `admins`.

Este repositorio es independiente del repositorio principal de la app
(vive anidado en `.panel_admon/` dentro de ese repo solo para que el código
de la app sea visible al construir el panel, pero está en su propio
`.gitignore` — nunca se commitea ahí).

## Staging

Publicado en GitHub Pages: **https://lhlopezm2.github.io/panel-admon-hermeskopio-staging/**

## Requisitos

- Node.js 20+ y npm.
- Acceso al proyecto Supabase de Hermeskopio (URL + anon key).
- Una cuenta de Hermeskopio cuyo `id` ya esté insertado en la tabla `admins`
  (ver "Pendiente" más abajo — hoy esa tabla está vacía).

## Correr en local

```bash
npm install
cp .env.example .env.local
# editar .env.local y completar VITE_SUPABASE_ANON_KEY (la anon key del
# proyecto; VITE_SUPABASE_URL ya viene con el valor correcto)
npm run dev
```

Abre la URL que imprime Vite (por defecto `http://localhost:5173`). El
login usa las mismas credenciales que la app Hermeskopio (Supabase Auth);
si la cuenta no está en `admins`, el panel la redirige de vuelta al login
con un mensaje de "no autorizado".

### Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | `tsc -b` (chequeo de tipos) + build de producción a `dist/` |
| `npm run preview` | Sirve localmente el contenido ya compilado de `dist/` |
| `npm test` | Corre la suite de tests (Vitest + Testing Library) una vez |
| `npm run test:watch` | Corre la suite de tests en modo watch |

`.env.local` nunca se commitea (está en `.gitignore` de este proyecto). La
única clave que vive en el bundle final es `VITE_SUPABASE_ANON_KEY` — es
pública por diseño, protegida del lado del servidor por RLS. El secret del
proveedor de correo (Resend) **no** vive en este proyecto en absoluto; solo
existe dentro de la Edge Function `send-bloqueo-email` del repo principal.

## Desplegar en GitHub Pages

El repo ya incluye el workflow `.github/workflows/deploy.yml`, que en cada
push a `main` compila el proyecto y lo publica vía GitHub Actions (no usa
una rama `gh-pages` manual).

1. **Crear el repositorio en GitHub** (vacío, sin README/license — este
   proyecto ya trae los suyos):
   ```bash
   cd /home/luis-lopez/Documentos/hermeskopio_claude/.panel_admon
   git init
   git add .
   git commit -m "Initial admin panel scaffold"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<nombre-repo>.git
   git push -u origin main
   ```

2. **Ajustar `vite.config.ts`** para que `base` coincida exactamente con el
   nombre del repositorio que creaste (hoy dice
   `/panel-admon-hermeskopio/` como placeholder):
   ```ts
   base: "/<nombre-repo>/",
   ```
   Si el nombre real del repo es distinto, cambia esta línea, haz commit y
   push antes del primer deploy — si no coincide, los assets (JS/CSS) del
   sitio publicado no cargarán.

3. **Configurar los secrets del repositorio** — Settings → Secrets and
   variables → Actions → New repository secret:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Activar GitHub Pages** — Settings → Pages → Build and deployment →
   Source: **"GitHub Actions"** (no "Deploy from a branch").

5. Cualquier push a `main` (incluido el paso 1) dispara el workflow. Revisa
   la pestaña **Actions** del repo para ver el progreso; al terminar, el
   panel queda publicado en
   `https://<tu-usuario>.github.io/<nombre-repo>/`.

## Pendiente

Estas piezas todavía no están resueltas y son necesarias para que el
bloqueo funcione de punta a punta:

- **Crear el repositorio en GitHub y hacer el push inicial** — el código
  está listo localmente pero `.panel_admon/` todavía no es un repositorio
  git (no se ha corrido `git init`). Seguir los pasos de la sección
  anterior.
- **Configurar y desplegar la Edge Function de correo** — se hace desde el
  repositorio principal de Hermeskopio (`supabase/functions/send-bloqueo-email/`),
  no desde este panel:
  ```bash
  supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx --linked
  supabase functions deploy send-bloqueo-email --linked
  ```
  Sin esto, el botón "Bloquear" del panel sí bloquea el negocio (eso ya
  funciona), pero el envío del correo de notificación fallará y el panel
  mostrará "correo no enviado" con la opción de reintentar.
- **Verificar el dominio remitente en Resend** — `index.ts` de la Edge
  Function usa `notificaciones@hermeskopio.com` como remitente (placeholder).
  Hay que verificar ese dominio (o uno real) en el panel de Resend antes de
  que los correos se entreguen; si no, Resend rechazará el envío.
- **Insertar el primer admin** — la tabla `admins` está vacía hoy a
  propósito (no hay flujo de auto-registro). Insertar manualmente, vía SQL
  editor de Supabase, la fila del primer administrador:
  ```sql
  insert into admins (id_persona) values ('<uuid de la persona en personas>');
  ```
- **Confirmar el `base` de `vite.config.ts`** una vez exista el nombre real
  del repositorio (paso 2 de la sección de despliegue).
