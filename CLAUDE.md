# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`).

- `pnpm dev` — run the dev server (Next.js)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — ESLint

There is no test suite. TypeScript build errors are intentionally ignored (`next.config.mjs` → `typescript.ignoreBuildErrors: true`), so `pnpm build` will not catch type errors — run `pnpm lint` / `tsc --noEmit` manually if you need type checking.

## What this app is

A single-tenant tool for the "GOBLET" gym/PT business to author **client evaluations** and **training routines**, export them as styled `.xlsx` files, and sync those files to the trainer's Google Drive. UI copy is in Spanish. There is no backend database — all working data lives in the browser's `localStorage`; Drive is the only durable store.

## Architecture

**Framework:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui components (`components/ui/*`, generated via `components.json`). Path alias `@/*` maps to the repo root.

**Auth gate (`proxy.ts`):** This is the Next.js middleware — in Next 16 `middleware` was renamed to `proxy`, so the file exports `proxy()` and `config`. It redirects any unauthenticated request to `/login`, excluding `api/auth`, `login`, static assets, and files with extensions. Auth itself is NextAuth (`lib/auth.ts`, route at `app/api/auth/[...nextauth]/route.ts`) with two providers:
  - **Credentials** — a hardcoded username/password gate (`APP_USERNAME` / `APP_PASSWORD` env vars) that lets the trainer into the app.
  - **Google** — requested with `drive.file` scope; its `access_token` is stashed on the JWT and surfaced on `session.accessToken` (typed in `types/next-auth.d.ts`). This token is what authorizes all Drive writes. Signing in with Google is what enables the "Guardar en Drive" buttons.

**Data flow / persistence:** There is no server-side data layer. `app/clientes/page.tsx` keeps the client list in `localStorage` under `goblet_demo_clients` (seeded with demo clients). `app/cliente/[id]/page.tsx` is the main editor: it debounce-autosaves the evaluation and routine to `localStorage` (`goblet_eval_${id}`, `goblet_routine_${id}`, `goblet_routine_meta_${id}`) and only pushes to Drive when the user clicks a "Guardar en Drive" button. "Copiar rutina de otro cliente" reads another client's `goblet_routine_${id}` blob directly.

**Two editors, two domains** — each has its own type module, builder component, and Excel exporter; keep the three in sync when changing a domain's shape:
  - Routine: `lib/types.ts` (RoutineData → days → blocks → exercises, each exercise has 5 weeks) · `components/routine-builder/` · `lib/excel-export.ts`
  - Evaluation: `lib/evaluation-types.ts` (patient data, goniometry sections, photographic record, etc.) · `components/evaluation-builder/` · `lib/evaluation-export.ts`

**Excel export:** `lib/excel-export.ts` and `lib/evaluation-export.ts` build `.xlsx` workbooks in-browser with **ExcelJS**, applying the GOBLET brand styling (orange `FFE67E22`, Arial, bordered cells, one worksheet per routine day). They return a `Buffer` used both for direct download and for Drive upload.

**Google Drive sync (`lib/drive-sync.ts`):** Talks to the Drive REST API directly with `fetch` + the session access token (no googleapis client on this path). Files are organized under a `GOBLET/` root folder:
  - Evaluations + client photos → `GOBLET/{clientName}/`
  - Routines → `GOBLET/{profesor}/{dia}/{horario}/{clientName}/` (the trainer/day/schedule dialog collects these before a routine save)
  Folders are found-or-created via `getOrCreateFolder`, and folder IDs are memoized in `localStorage` (`goblet_drive_folder_cache`) to avoid duplicate folders and repeated lookups. Uploads are multipart; an existing file of the same name is replaced with PATCH rather than duplicated.

## Important constraints

- **`CLAUDE.md` and `.claude` are gitignored** — this file will not be committed.
- Env vars live in `.env.local` (gitignored): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `APP_USERNAME`, `APP_PASSWORD`. The credentials-provider username/password is a plaintext env comparison — change it before deploying.
- Most Drive/persistence logic runs client-side and depends on `localStorage` and the Google access token, so it only works in the browser after a Google sign-in.
