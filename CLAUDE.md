# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The committed lockfile is **pnpm** (`pnpm-lock.yaml`, lockfile v9), but the local `node_modules` was installed with npm and pnpm isn't installed globally. When adding a dependency: `npm install <pkg>`, then `npx -y pnpm@10 install --lockfile-only` so `pnpm-lock.yaml` stays in sync for deploys.

- `npm run dev` — dev server (Next.js)
- `npm run build` / `npm start` — production build / serve it
- `npm run db:generate` — generate a SQL migration in `drizzle/` from `lib/db/schema.ts`
- `npm run db:migrate` — apply pending migrations to `DATABASE_URL`
- `npm run crear-usuario -- <username> "<Nombre>"` — create a teacher from the terminal (prompts for the password); used to bootstrap the first user

There is no test suite and ESLint is not actually installed (the `lint` script fails). TypeScript build errors are intentionally ignored (`next.config.mjs` → `typescript.ignoreBuildErrors: true`), so run `npx tsc --noEmit` to type-check.

## What this app is

A tool for the "GOBLET" gym/PT business where **profesores** (teachers, the app's users) author **alumno evaluations** and **training routines**, export them as styled `.xlsx` files and save those to their own Google Drive. UI copy is in Spanish; the people being trained are **alumnos** (never "clientes") in everything the user sees.

**Neon Postgres is the source of truth** for users, alumnos, evaluations, photos and routines. Google Drive only receives `.xlsx` exports (and photo copies). There is no `localStorage` data cache any more — it leaked data between teachers sharing a computer.

## Architecture

**Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (`components/ui/*`). Path alias `@/*` → repo root.

**Database (`lib/db/`):** Drizzle ORM over `@neondatabase/serverless` (`neon-http` driver). `getDb()` creates the client lazily because `next build` imports routes without `DATABASE_URL`. There are no interactive transactions on `neon-http` — use `getDb().batch([...])` for atomic multi-insert writes (see `crearAlumnoCompleto` in `lib/db/alumnos.ts`). Tables (`lib/db/schema.ts`):
  - `usuarios` — teachers. `username` is always lowercase. `es_admin` is **only ever set in the DB** (no route writes it; `POST /api/usuarios` forces `false`). Users are deactivated (`activo`), never deleted. `debe_cambiar_password` forces a password change on next login. `google_refresh_token` is AES-256-GCM encrypted with `GOOGLE_TOKEN_KEY`.
  - `alumnos` — `creado_por`, `dia`/`horario` (for the Drive folder), `legacy_id` (id from the old Drive JSON, makes import idempotent).
  - `evaluaciones` — one per alumno, `datos` JSONB (EvaluationData, always with `registroFotografico: []`).
  - `evaluacion_fotos` — one row per photo, `data_url` of a JPEG compressed in the browser (`lib/image-compress.ts`).
  - `rutinas` — **one per alumno**, `datos` JSONB (RoutineData), `usuario_id` = creator, and the creator's Drive copy (`google_drive_file_id`/`google_drive_link`).
  - `rutina_accesos` — teachers a routine was transferred to, each with their own Drive copy columns.

**Permissions (`lib/db/permisos.ts`):** admin sees and edits everything. A teacher sees an alumno (and edits its evaluation, photos and routine) if they created it or have a `rutina_accesos` row for its routine. Only the creator or admin deletes an alumno. Anyone with access can transfer the routine to another teacher by username (`POST /api/rutinas/[id]/accesos`); transferring never removes access. Invisible resources return **404, not 403**. Every API route goes through `obtenerAccesoAlumno`/`obtenerAccesoRutina`/`alumnosVisiblesWhere`.

**Auth:** NextAuth v4, Credentials provider only, checked against `usuarios` with bcrypt (`lib/auth.ts`). The JWT carries `id`, `username`, `nombre`, `esAdmin`, `debeCambiarPassword` and re-reads them from the DB every 60s or on `update()`. **API routes don't trust the JWT**: `requireUser()`/`requireAdmin()` in `lib/auth-server.ts` read the user from the DB on every request and return 403 `DEBE_CAMBIAR_PASSWORD` while a change is pending. Route handlers are wrapped in `ruta()` (turns `HttpError`/`ZodError` into JSON) and parse bodies with `leerBody(req, zodSchema)`. On the client, `api()` in `lib/api-client.ts` redirects to `/login` on 401 and to `/cambiar-password` on that 403; response shapes live in `lib/api-types.ts`.

`proxy.ts` is the Next 16 middleware (renamed from `middleware`): no `token.id` → `/login` for pages, JSON 401 for `/api/*`; `debeCambiarPassword` → `/cambiar-password`. Password recovery has no email: the admin sets a temporary password in `/usuarios`, and new users created there must also change theirs on first login.

**Google Drive — each teacher's own Drive:** Google is not a login method. A logged-in teacher connects Drive via `/api/google/connect` → Google consent (`drive.file`, offline) → `/api/google/callback`, which stores the encrypted refresh token. `/api/google/token` hands the browser short-lived access tokens (409 `DRIVE_RECONECTAR` when revoked); `hooks/use-drive.ts` caches them and scopes the Drive folder-id cache per Google account. The Google Cloud OAuth client needs `{NEXTAUTH_URL}/api/google/callback` as a redirect URI.

`lib/drive-sync.ts` talks to the Drive REST API with `fetch`. Exports go to `GOBLET/{teacher nombre}/{dia}/{horario}/{alumno}/` in the exporting teacher's Drive. `uploadBinaryFile` returns `{id, webViewLink}`; after a routine export the editor records it with `POST /api/rutinas/[id]/drive` (the creator's copy goes on `rutinas`, a transferred teacher's on their `rutina_accesos` row). Because of `drive.file`, a teacher cannot open another teacher's Drive files — that's why content lives in the DB.

**Editor (`app/alumno/[id]/page.tsx`):** loads `GET /api/alumnos/[id]` + `/fotos`, and doesn't render the builders until loaded. Debounced (1.5s) autosave sends only what changed (`PUT .../evaluacion`, `PUT /api/rutinas/[id]`), tracked with `last*Ref` serializations, and flushes on unmount. Photos are uploaded one per request and appended with functional state updates (passing `data` to `onChange` per photo used to keep only the last one). Concurrent edits are last-write-wins.

**Two editors, two domains** — keep type module, builder and exporter in sync when changing a shape:
  - Routine: `lib/types.ts` · `components/routine-builder/` · `lib/excel-export.ts`
  - Evaluation: `lib/evaluation-types.ts` · `components/evaluation-builder/` (receives photos as `fotos`/`onAddPhotos`/`onRemovePhoto` props, not inside `data`) · `lib/evaluation-export.ts`

**Excel export:** ExcelJS in the browser with GOBLET styling (orange `FFE67E22`, Arial, bordered cells, one worksheet per routine day); returns a `Buffer` for download and Drive upload.

**Legacy import (`/importar`, `lib/legacy-drive-import.ts`, `POST /api/importar`):** reads the pre-DB data (`GOBLET/_datos/alumnos.json`, `alumno_{id}.json`, `alumno_{id}_fotos.json`, plus old `localStorage` keys `goblet_demo_clients`/`goblet_eval_*`/`goblet_routine_*`/`goblet_routine_meta_*`) and creates the alumnos under the logged-in teacher. Idempotent by `legacy_id`; never writes to Drive.

## Important constraints

- **`CLAUDE.md` and `.claude` are gitignored** — this file will not be committed.
- Env vars (`.env` / `.env.local`, gitignored): `DATABASE_URL` (Neon pooled connection string), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_TOKEN_KEY` (`openssl rand -base64 32`; changing it forces every teacher to reconnect Drive). `APP_USERNAME`, `APP_PASSWORD` and `ALLOWED_GOOGLE_EMAILS` are no longer used.
- Bootstrapping an admin: `npm run crear-usuario -- <username> "<Nombre>"`, then in Neon's SQL editor `UPDATE usuarios SET es_admin = true WHERE username = '<username>';`.
