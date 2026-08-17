# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A standalone React + Vite + TypeScript + Tailwind panel used by a Hermeskopio
admin to review accumulated reports on a business and block/unblock it. It
authenticates against the **same Supabase project** as the main Hermeskopio
Flutter app — an admin is just a normal account (`personas` row / Supabase
Auth) that additionally has a row in the `admins` table.

This directory is nested inside the main app's repo (`hermeskopio_claude/`)
purely so the panel's code is co-located with the schema it depends on, but
it is **its own independent git repository** (`git init`'d here, pushed to
`panel-admon-hermeskopio-staging` on GitHub) and is listed in the parent
repo's `.gitignore` — it is never committed there. Always run git commands
from inside `.panel_admon/`, not the parent repo.

## Commands

```bash
npm install
cp .env.example .env.local        # fill in VITE_SUPABASE_ANON_KEY

npm run dev                       # dev server with hot reload
npm run build                     # tsc -b (typecheck) + production build to dist/
npm run preview                   # serve the built dist/ locally

npm test                          # vitest run — full suite, once
npm run test:watch                # vitest — watch mode
npx vitest run src/routes/__tests__/BusinessDetailPage.test.tsx   # single file
```

`.env.local` is gitignored. `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are
read via `import.meta.env` in `src/supabaseClient.ts`, which throws
immediately at import time if either is missing — nothing in the app can
render without them. `VITE_SUPABASE_ANON_KEY` is the only secret that ends
up in the built bundle; it's public by design (protected server-side by
RLS). The Resend API key for the notification email lives only in the main
repo's `supabase/functions/send-bloqueo-email/` Edge Function environment —
never in this project.

Deployment is automatic: `.github/workflows/deploy.yml` builds and publishes
to GitHub Pages on every push to `main`, injecting the two `VITE_*` vars
from repository secrets. `vite.config.ts`'s `base` must exactly match the
GitHub repo name or the deployed assets 404.

## Architecture

### Routing and auth gate (`src/App.tsx`, `src/routes/AdminGuard.tsx`)

`App.tsx` uses `HashRouter`, not `BrowserRouter` — GitHub Pages is a static
file server with no rewrites, and only one real file (`index.html`) exists
at the site root, so under `BrowserRouter` a hard reload on *any* non-root
path (`/login`, `/reportes`, `/negocio/:id`, ...) 404s before React ever
loads. `HashRouter` keeps the route after a `#` (e.g.
`.../#/reportes/negocios`), which browsers never send to the server, so a
reload always requests the same always-present `index.html` regardless of
which route is active. The tradeoff is purely cosmetic (a visible `#` in
the URL) — there is no `public/404.html` fallback script anywhere in this
repo; `HashRouter` was chosen specifically to avoid needing one.

Routes: `/login` (public); `/reportes` (wrapped by `AdminGuard`, then by
`ReportsLayout` as a nested layout route) with 3 child routes —
`/reportes/negocios`, `/reportes/necesidades`, `/reportes/problemas` — plus
an index redirect from bare `/reportes` to `/reportes/negocios`;
`/negocio/:id` (wrapped by `AdminGuard` only, not `ReportsLayout` — it's a
drill-down detail view, not one of the 3 tabs); and a catch-all that
redirects to `/reportes`. `AdminGuard` is the single authorization
chokepoint — it checks for a Supabase session, then calls the `is_admin()`
RPC (the exact same predicate the database's RLS policies evaluate), and
redirects to `/login` if either check fails. There is no client-side admin
allowlist or role field anywhere in this codebase; `is_admin()` is the only
source of truth, and it's re-checked on every guarded navigation, not
cached.

`LoginPage` does its own redundant `is_admin()` check right after sign-in
(to show an inline "not authorized" message and sign back out instead of
bouncing through `/login` a second time) — this is intentionally duplicated
logic, not a shared hook, since the two components need different failure
UX (inline error vs. silent redirect). On success it navigates straight to
`/reportes/negocios`, not bare `/reportes`.

### Tabs (`src/routes/ReportsLayout.tsx`)

`ReportsLayout` is the layout route for the 3 top-level tabs — real routes
(not in-memory tab state), so each is refreshable/deep-linkable like every
other screen in this panel. It owns the tab nav (`NavLink`, active-state
styling) and the "Cerrar sesión" button (moved here from the old
`ReportsListPage` since it now applies to all 3 tabs, not just one), and
renders the active child via `<Outlet />`. `NecesidadesReportadasPage` and
`ProblemasReportadosPage` are deliberately empty ("Próximamente.") — both
`necesidades_reportadas` and `problemas_reportados` are insert-only tables
with no admin SELECT policy yet, so there's nothing to fetch until that
functionality is designed.

### Report moderation flow (`src/routes/NegociosReportadosPage.tsx`, `src/routes/BusinessDetailPage.tsx`)

`NegociosReportadosPage` (the `/reportes/negocios` tab) renders two
independent listings **side by side** (`grid md:grid-cols-2`, stacking to a
single column below the `md` breakpoint) rather than one below the other —
with a business count in the thousands, stacking them would force scrolling
past the entire first list before ever seeing "Bloqueados". Each has its
own debounced (300 ms, `src/lib/useDebouncedValue.ts`) search-by-owner-email
input and paginates independently at `PAGE_SIZE = 10`
(`PaginationControls`, a small private component shared by both sections —
"← Anterior" / "Página X de Y" / "Siguiente →", `Anterior` disabled on page
1, `Siguiente` disabled on the last page, both hidden entirely when the
list is empty): "Con reportes pendientes" (businesses with at least one
`pendiente` report) and "Bloqueados" (`businesses.bloqueado = true`,
regardless of whether they ever had a report — an admin can block from
`BusinessDetailPage` with just a motivo, no report required). Both come
from `security definer` RPCs —
`admin_list_negocios_reportados_pendientes(p_email_search, p_limit,
p_offset)` and `admin_list_negocios_bloqueados(p_email_search, p_limit,
p_offset)` (`supabase/migrations/20260817221541_...`, pagination added in
`20260817223310_admin_list_negocios_pagination.sql`) — rather than a
client-side embedded select like the old single-list version used. Reason:
searching by the owner's email requires reading `personas.email` joined
through `persona_negocio` (`rol = 'owner'` specifically, never a delegate),
and neither table has an admin-read RLS policy — only `businesses` and
`reports` do (`20260813044922`, `20260813044929`). Rather than opening
broad RLS read access to those two tables, the join and the `is_admin()`
check both happen server-side inside the RPCs, so the client only ever
receives the handful of columns the UI needs. Each RPC computes
`total_count` via `count(*) over()` on a CTE — evaluated before
`limit`/`offset` apply, so it reflects the full matched set, not the
current page — and the client reads `total_count` off `data[0]` (absent
entirely when the page is empty, handled as `0`) to compute total pages.
Typing in a search box resets that section's page to 1 **synchronously in
the `onChange` handler**, not in an effect keyed off the debounced value —
doing it there would leave a one-render window where the old page number
and the new debounced search value coexist, firing an extra fetch for a
stale offset against the new filter. The two lists are structurally
disjoint in practice: `block_negocio` auto-transitions a business's
`pendiente` reports to `accionado`, so a newly-blocked business drops out
of the first list as it enters the second.

`BusinessDetailPage` is where blocking actually happens, via two
`security definer` RPCs owned by the main repo's migrations:
`block_negocio(p_negocio_id, p_motivo)` and `unblock_negocio(p_negocio_id)`.
Both use custom Postgres error codes matched by `error.code` (not message
text) — `BL001` (already blocked) and `BL002` (already unblocked) get their
own friendly inline messages; any other error falls back to
`error.message`. Note the asymmetry: `handleBlock` returns early without
reloading on a non-`BL001` error, but `handleUnblock` always reloads
regardless of error outcome — this is deliberate, not a bug, since a block
attempt that truly failed shouldn't touch state, while an unblock is safe
to re-sync either way.

Blocking a business also writes a row to `bloqueo_historial` and returns its
id; the page uses that id to immediately call the `send-bloqueo-email` Edge
Function (defined in the main repo, not here) to notify the business owner.
Email delivery state (`idle`/`sending`/`sent`/`failed`) is derived, not
stored — `load()` re-derives it from whether the most recent `accion:
'bloqueo'` row in `bloqueo_historial` has `email_enviado = true`, so a
failed send surfaces a "Reintentar" button on next load, not just
immediately after the block action.

Dismissing a report (`handleDismissReport`) is the *only* other way a
report's `status` changes short of `block_negocio` auto-transitioning
`pendiente` reports on that business to `accionado` — there is no bulk
dismiss and no way to change status back.

### Data shapes (`src/lib/types.ts`)

Every row shape read from Supabase (`Business`, `Report`, `BloqueoHistorialRow`,
`NegocioReportadoPendiente`, `NegocioBloqueado`) and the
`ReportReason`/`ReportStatus`/`BloqueoAccion` unions are declared once here
and imported everywhere — there is no separate model/DTO layer like the
Flutter app's `data/models/`, since this panel only ever reads rows close
to their raw table/RPC-return shape. `NegocioReportadoPendiente` and
`NegocioBloqueado` mirror the two admin-listing RPCs' `returns table(...)`
column-for-column, not any actual table.

### Tests (`src/**/__tests__/`)

Vitest + Testing Library, jsdom environment (`vitest.config.ts`,
`globals: true` — enabled solely so Testing Library's internal
auto-cleanup, which checks for a global `afterEach`, registers correctly).
Every test file still imports `describe`/`it`/`expect`/`vi` explicitly from
`"vitest"` rather than relying on the globals.

`src/test/chainable.ts` is the shared mock for Supabase's query builder: a
single object that is both chainable (`.select().eq().order()...` all
return the same object) and directly awaitable (implements `.then`), since
the real supabase-js builder supports both usages and call sites in this
codebase use either depending on whether `.single()` is needed. Pass it a
plain result, or a function returning one when a test needs to simulate a
row changing between an initial load and a reload (see
`BusinessDetailPage.test.tsx`'s `setupMocks`, which mutates a shared
`state` object from inside RPC mocks to simulate `block_negocio`/
`unblock_negocio` actually changing `businesses.bloqueado` server-side).

Test files (`*.test.ts(x)`, `__tests__/`, `src/test/`) are excluded from
`tsconfig.json`'s build (`tsc -b` via `npm run build`) so their looser
patterns aren't held to the same `noUnusedLocals`/`noUnusedParameters`
strictness as production code — Vitest itself doesn't typecheck, so this
exclusion has no effect on `npm test`.

## Relationship to the main repo

This panel has no local copy of the database schema — it only ever talks to
the same remote Supabase project the Flutter app uses, via
`@supabase/supabase-js` and the anon key. Schema changes (new tables, RLS
policies, RPCs like `is_admin()`/`block_negocio`/`unblock_negocio`) are
migrations tracked in the main repo's `supabase/migrations/`, not here.
When a change here depends on new server-side behavior, the corresponding
migration lives in `../supabase/migrations/`, and the `send-bloqueo-email`
Edge Function lives in `../supabase/functions/send-bloqueo-email/`.
