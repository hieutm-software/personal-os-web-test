# Personal OS — Living Architecture & State Document

> **Managed autonomously by AI.** This document is the single source of truth for the
> current project state. It is rewritten or patched at the start of every meaningful
> session. Do not add manual checkbox roadmaps here.

_Last updated: 2026-06-08_

---

## 1. Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.7 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 + shadcn/ui primitives | ^4 |
| Database | Neon Serverless Postgres + Drizzle ORM | drizzle 0.45.2 |
| Auth | Edge JWT (`jose`) + bcryptjs, HTTP-only cookie | jose 6.2.3 |
| Server Actions | `next-safe-action` + Zod v4 schemas | 8.5.3 |
| i18n | `next-intl` (EN / VI dictionaries) | 4.13.0 |
| State (URL) | `nuqs` query-state hooks | 2.8.9 |
| Animations | Framer Motion | 12.40.0 |
| Markdown | `marked` + `dompurify` (XSS-sanitised) | marked 18 |
| Forms | `react-hook-form` + `@hookform/resolvers` | 7.77.0 |
| Cron | Vercel Cron (`vercel.json`) — hourly overdue scanner | — |
| Linting | ESLint 9 flat config + `eslint-config-next` | ^9 |
| Pre-commit | Husky 9 + lint-staged 17 | — |
| Package mgr | pnpm (workspace) | — |

---

## 2. Active Features

### Authentication
- Username/password login with intentional brute-force delay.
- JWT signed with `jose`, stored in a `HttpOnly; Secure; SameSite=Lax` cookie.
- Middleware RBAC: unauthenticated → `/login`; non-admin → blocked from `/settings/admin`.

### Data Modules
| Module | Route | Key Files |
|---|---|---|
| Tasks | `/tasks` | `src/app/tasks/page.tsx`, `src/lib/actions/tasks.ts` |
| Calendar / Events | `/calendar` | `src/app/calendar/page.tsx`, `src/lib/actions/events.ts` |
| Notes (Markdown) | `/notes` | `src/app/notes/notes-client.tsx`, `src/lib/actions/docs.ts` |
| Settings | `/settings` | `src/app/settings/page.tsx`, `src/lib/actions/users.ts` |
| Documents | `/documents` | `src/app/documents/page.tsx`, `src/lib/actions/documents.ts` |
| Password Vault | `/vault` | `src/app/vault/page.tsx`, `src/lib/actions/vault.ts` |
| Dashboard | `/` | `src/app/page.tsx` (Bento-grid) |

### Cross-cutting Concerns
- **Multi-tenant isolation**: every DB mutation chains `eq(<table>.userId, session.userId)`.
- **URL state**: `nuqs` syncs filters and active note ID to the URL without full re-renders.
- **Autosave**: 5-second debounce in the notes editor; status indicator in the header.
- **Overdue cron**: `GET /api/cron/overdue` runs hourly via Vercel Cron, secured by `CRON_SECRET`.
- **Responsive layout**: Mobile `<768px` uses a Hamburger Sheet (Radix Dialog). Desktop uses a sticky sidebar.

---

## 3. Known Technical Debt & Architectural Trade-offs

### ~~TW v4 HEX Color Variable Override~~ ✅ Resolved
> **Resolved in Phase 3.1** — Custom HEX color override removed from both `settings/page.tsx`
> and `providers.tsx`. The `personal-os-primary-color` localStorage key is no longer written.
> Themes are now strictly `light | dark | system`, all using CSS variable tokens defined in
> `globals.css` (Office 365-inspired palette with glassmorphism utilities).

### `react-hooks/set-state-in-effect` Suppression (Low Risk)
Three locations use `// eslint-disable-next-line react-hooks/set-state-in-effect` for
intentional, legitimate patterns (localStorage hydration, derived-state sync, route-change
drawer close). Each is documented inline with a rationale comment.

### No Optimistic UI on Mutations
Server actions use `next-safe-action`'s `useAction` hook. UI updates happen after
`revalidatePath` completes a round-trip. For low-latency targets, consider wrapping
mutations with `useOptimistic` from React 19.

### Seed Script Requires Direct DB Access
`pnpm db:seed` (`src/lib/db/seed.ts`) must be run locally with `DATABASE_URL` set. There
is no in-app admin "bootstrap" route. On a fresh deployment, the seed must be run once
from a local environment with Neon credentials.

---

## 4. Environment Variables

| Variable | Source | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Neon → Connection String | ✅ | Pooled serverless URL |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | ✅ | Min 32 chars |
| `NEXT_PUBLIC_APP_URL` | Vercel project URL | ✅ | e.g. `https://your-app.vercel.app` |
| `CRON_SECRET` | Generate: `openssl rand -hex 20` | ✅ (prod) | Header: `Authorization: Bearer <secret>` |
| `SUDO_PASSWORD` | Any strong string | ✅ | Guards admin user CRUD |

---

## 5. Active Tasks

_This section is managed by the AI. Items are added here when work begins and removed/archived when complete._

### ✅ Phase 3.1 — Global UI/UX Premium Overhaul (Completed 2026-06-05)

| Change | Files Modified |
|---|---|
| Premium CSS design system (Office 365-style glassmorphism, dark/light themes) | `src/app/globals.css` |
| Removed HEX accent color; 3-theme enforcement (Dark/Light/System) | `src/app/providers.tsx`, `src/app/settings/page.tsx` |
| Sidebar collapse/expand toggle + Settings pinned bottom + Logout removed | `src/components/layout/sidebar.tsx` |
| Mobile nav logout removed | `src/components/layout/mobile-nav.tsx` |
| Logout server action added (clears session cookie) | `src/lib/actions/auth.ts` |
| Logout button moved inside `/settings` Account card | `src/app/settings/page.tsx` |
| Dashboard: Stat Cards are clickable links; "View All" text links removed | `src/app/page.tsx` |
| Global premium select & date-picker CSS | `src/app/globals.css` |
| i18n keys added for new Settings sections | `messages/en.json`, `messages/vi.json` |

> **Status**: Clean — 0 TypeScript errors post-implementation.

### ✅ Phase 3.2 — Complete UX Shift to Popup/Modal Architecture (Completed 2026-06-05)

| Change | Files Modified |
|---|---|
| Introduced standard Shadcn UI `<Dialog>` component | `src/components/ui/dialog.tsx` |
| Removed Tasks sidebar form. Adopted full-width grid layout with 'Create Task' & 'Edit Task' Dialogs. | `src/app/tasks/tasks-client.tsx` |
| Removed Calendar side panel. Day clicks now open a Day View Dialog with an 'Add Event' form toggle. | `src/app/calendar/calendar-client.tsx` |
| Implemented dynamic `endTime >= startTime` adjustments. | `src/app/calendar/calendar-client.tsx` |
| Added data retention logic to hard-delete tasks and events older than 30 days. | `src/app/api/cron/overdue/route.ts` |

> **Status**: Clean — 0 TypeScript errors post-implementation. Data retention logic tested manually.

### ✅ Phase 3.3 — Notes Module Overhaul & Trash System (Completed 2026-06-05)

| Change | Files Modified |
|---|---|
| Implemented `deletedAt` schema for soft deletion | `src/lib/db/schema/index.ts` |
| Updated Note Actions to support soft delete, restore, and hard delete | `src/lib/actions/docs.ts` |
| Overhauled Notes UI to File Explorer Table view, added Trash tab | `src/app/notes/notes-client.tsx` |
| Moved Note Editor to Dialog, added manual save & upload/download | `src/app/notes/notes-client.tsx` |
| Enhanced MarkdownEditor with formatting toolbar | `src/components/editor/markdown.tsx` |
| Updated Cron job to delete trashed notes older than 14 days | `src/app/api/cron/overdue/route.ts` |

> **Status**: Clean — 0 TypeScript errors post-implementation. Database schema successfully migrated.

### ✅ Phase 3.4 — Documents Viewer, Password Vault, and Admin Management (Completed 2026-06-05)

| Change | Files Modified |
|---|---|
| Implemented `documents`, `vault`, and `sessions` DB schemas | `src/lib/db/schema/index.ts` |
| Enhanced Auth logic to track login sessions with IP/Device/Location | `src/lib/actions/auth.ts`, `src/lib/auth.ts` |
| Built Password Vault with AES-256-GCM encryption and 1-click copy | `src/app/vault/vault-client.tsx`, `src/lib/actions/vault.ts` |
| Implemented Documents Module with local file upload and Office/PDF viewer | `src/app/documents/documents-client.tsx`, `src/lib/actions/documents.ts` |
| Converted Admin User Management to Dialog inside `/settings` | `src/app/settings/admin-dialog.tsx`, `src/app/settings/page.tsx` |
| Added Login Sessions view in Settings | `src/app/settings/sessions-view.tsx`, `src/app/settings/settings-client.tsx` |

> **Status**: Clean — 0 TypeScript errors post-implementation. Database schema successfully migrated.

### ✅ Phase 3.5 — UI Bug Fixes and Dashboard Redesign (Completed 2026-06-05)

| Change | Files Modified |
|---|---|
| Fixed Sidebar overlap, forced `w-16` width on collapse, added Gemini-style Menu toggle | `src/components/layout/sidebar.tsx` |
| Replaced Dashboard lists with pure Tailwind CSS Statistical Charts (Task Completion Ring, Event Activity) | `src/app/page.tsx` |
| Cleaned up unused imports and sub-components across dashboard and calendar modules | `src/app/page.tsx`, `src/app/calendar/calendar-client.tsx` |

> **Status**: Clean — 0 TypeScript errors post-implementation. UI improved with Office 365 / Glassmorphism aesthetic.

### ✅ Phase 3.6 — Codebase Linting, Clean Up & Light Theme Redesign (Completed 2026-06-08)

| Change | Files Modified |
|---|---|
| Resolved global React Compiler hook warnings (`react-hooks/exhaustive-deps`, `react-hooks/incompatible-library`) | `src/app/settings/admin-dialog.tsx`, `src/app/(auth)/login/signup-form.tsx` |
| Configured ESLint to ignore `public/**` uploads directory to prevent false positive scans on user documents | `eslint.config.mjs` |
| Removed unused dependencies, variables, and imports across the codebase (e.g. `drizzle` in `migrate.ts`, `useEffect` in UI components) | `src/lib/db/migrate.ts`, `src/app/settings/admin-dialog.tsx` |
| Fixed UI layout misalignment in the Admin Dialog (fixed table width, corrected ActionButton usage, and adjusted spacing) | `src/app/settings/admin-dialog.tsx` |
| Completely redesigned the Light Theme using Tailwind's `slate` color palette for high contrast and readability. | `src/app/globals.css` |
| Generated `README.md` with project setup instructions and Vercel deployment guide. Removed debug files. | `README.md`, `docs/context.md` |

> **Status**: Clean — Codebase achieves 0 warnings and 0 errors under `pnpm run lint`. Light Theme contrast meets accessibility standards.
