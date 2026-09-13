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

## Ambientes: staging vs. prod

Igual que la app Flutter, staging y prod son completamente independientes —
cada uno es su propio repositorio de GitHub (mismo código, distinta
remota), con su propio proyecto Supabase, sus propios secrets y su propio
sitio de GitHub Pages.

| Ambiente | Repo (remoto local) | URL publicada | Proyecto Supabase |
|---|---|---|---|
| Staging | `origin` → `panel-admon-hermeskopio-staging` | https://lhlopezm2.github.io/panel-admon-hermeskopio-staging/ | staging |
| Prod | `prod` → `panel-admon-hermeskopio-prod` | https://lhlopezm2.github.io/panel-admon-hermeskopio-prod/ | prod |

Este repositorio (`origin`, staging) es la única fuente de verdad — no hay
una segunda copia del código con su propia historia de git. Promover un
cambio ya probado en staging a prod es un solo comando:

```bash
git push prod main
```

Eso empuja el mismo commit al repo de prod, que dispara su propio
`deploy.yml` (idéntico al de este repo) usando **sus propios** secrets
(`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` del proyecto Supabase de
prod) y su propia variable de repo `VITE_BASE_PATH` — no hace falta tocar
código ni hacer un commit distinto para cada ambiente (ver
`vite.config.ts`).

## Requisitos

- Node.js 20+ y npm.
- Acceso al proyecto Supabase de Hermeskopio del ambiente que quieras correr
  (URL + anon key) — staging y prod son proyectos separados.
- Una cuenta de Hermeskopio cuyo `id` ya esté insertado en la tabla `admins`
  **de ese mismo proyecto** (ver "Pendiente" más abajo) — la tabla `admins`
  es independiente por proyecto Supabase, así que un admin de staging no es
  automáticamente admin en prod.

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

Cada repo (staging y prod) incluye el mismo workflow
`.github/workflows/deploy.yml`, que en cada push a `main` compila el
proyecto y lo publica vía GitHub Actions (no usa una rama `gh-pages`
manual). `vite.config.ts`'s `base` no está hardcodeado — se lee de la
variable de repo `VITE_BASE_PATH` en tiempo de build (con el valor de
staging como fallback si esa variable no existe), justo para que el mismo
commit sirva para ambos repos sin editar el archivo cada vez.

Para dar de alta un ambiente nuevo (staging y prod ya están configurados;
esto solo aplica si se agrega un tercero en el futuro):

1. **Crear el repositorio en GitHub** (vacío, sin README/license), y
   agregarlo como remoto acá:
   ```bash
   git remote add <nombre-remoto> https://github.com/<tu-usuario>/<nombre-repo>.git
   git push <nombre-remoto> main
   ```
2. **Configurar los secrets del repositorio nuevo** — Settings → Secrets
   and variables → Actions → New repository secret:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` del proyecto Supabase
     de ese ambiente.
3. **Configurar la variable del repositorio nuevo** — Settings → Secrets
   and variables → Actions → pestaña **Variables** → New repository
   variable:
   - `VITE_BASE_PATH` = `/<nombre-repo>/` (debe coincidir exactamente con
     el nombre del repo o los assets del sitio publicado no cargarán).
4. **Activar GitHub Pages** — Settings → Pages → Build and deployment →
   Source: **"GitHub Actions"** (no "Deploy from a branch").
5. El push del paso 1 ya dispara el workflow. Revisa la pestaña
   **Actions** del repo nuevo para ver el progreso; al terminar, el panel
   queda publicado en `https://<tu-usuario>.github.io/<nombre-repo>/`.

## Pendiente

Estas piezas todavía no están resueltas y son necesarias para que el
bloqueo funcione de punta a punta:

- **Verificar un dominio remitente propio en Resend para prod** — la Edge
  Function (`../supabase/functions/send-bloqueo-email/`, repositorio
  principal) lee el remitente del secret `RESEND_FROM_ADDRESS`, con un
  valor independiente por proyecto Supabase. Hoy staging **y** prod
  apuntan al dominio sandbox de Resend (`onboarding@resend.dev`, que solo
  entrega al correo con el que se registró la cuenta de Resend) — una vez
  verificado un dominio propio en el panel de Resend, actualizar solo el
  secret de prod:
  ```bash
  supabase secrets set RESEND_FROM_ADDRESS="Hermeskopio <notificaciones@hermeskopio.com>" --project-ref <ref-de-prod>
  ```
  No hace falta volver a desplegar la función — los secrets se leen en
  cada invocación.
- **Insertar el primer admin** — la tabla `admins` está vacía hoy a
  propósito (no hay flujo de auto-registro), y es independiente por
  proyecto Supabase (staging y prod cada uno necesita su propia fila).
  Insertar manualmente, vía SQL editor de Supabase, la fila del primer
  administrador en el proyecto correspondiente:
  ```sql
  insert into admins (id_persona) values ('<uuid de la persona en personas>');
  ```
