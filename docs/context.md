# Personal OS — Living Architecture & State Document

> **Managed autonomously by AI.** This document is the single source of truth for the
> current project state. It is rewritten or patched at the start of every meaningful
> session. Do not add manual checkbox roadmaps here.

_Last updated: 2026-06-10_

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

## 2. System Architecture & Modules

### Authentication & Security
- **Mechanism:** Username/password login with intentional brute-force delay.
- **Tokens:** JWT signed with `jose`, stored in a `HttpOnly; Secure; SameSite=Lax` cookie.
- **Middleware RBAC:** 
  - Unauthenticated users are redirected to `/login`.
  - Non-admin users are blocked from accessing `/settings/admin`.
- **Session Tracking:** The database `sessions` table tracks `ip`, `device`, `location`, and `loginAt` to provide an audit trail for the admin.

### Database Schema
Built with **Drizzle ORM**, the Postgres database contains the following core tables:
- `users`: Core user accounts (with `role`: `USER` / `ADMIN`).
- `verification_tokens`: For email/password recovery flows.
- `tasks`: Todo items with `status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`).
- `events`: Calendar entries supporting `startTime`, `endTime`, and `recurrence`.
- `notes`: Markdown content supporting soft deletion (`deletedAt`).
- `document_folders` & `documents`: Hierarchical file management with metadata (`sizeBytes`, `mimeType`, `url`).
- `vault`: Secure credential storage with AES-256-GCM `passwordEncrypted`.
- `sessions`: Login audit logs.

### File Storage Strategy
- **Local Fallback:** Files can be uploaded and stored locally in the `public/uploads/documents` directory.
- **Supabase Integration:** The Documents module integrates directly with Supabase Storage. File URLs point to a local proxy route (`/api/files?path=...`) which streams the data from Supabase to protect bucket URLs and enforce authentication. Storage usage limits (max 25MB/file, 300MB total) are strictly enforced in Server Actions.

### Module Breakdown
| Module | Route | Key Files | Description |
|---|---|---|---|
| **Dashboard** | `/` | `src/app/page.tsx` | Bento-grid overview with statistical charts built in pure Tailwind CSS. |
| **Tasks** | `/tasks` | `src/app/tasks/page.tsx`, `src/lib/actions/tasks.ts` | Todo management with full-width grid layout and "Create/Edit Task" dialogs. |
| **Calendar** | `/calendar` | `src/app/calendar/page.tsx`, `src/lib/actions/events.ts` | Month view with day-click Dialogs for event management. Features `endTime >= startTime` adjustments. |
| **Notes** | `/notes` | `src/app/notes/notes-client.tsx`, `src/lib/actions/docs.ts` | File Explorer Table view with a Markdown editor Dialog. Features 5-second autosave, soft delete, and Trash tab. |
| **Documents** | `/documents` | `src/app/documents/page.tsx`, `src/lib/actions/documents.ts` | File manager supporting folders, Supabase upload via signed URLs, and file previewers. |
| **Vault** | `/vault` | `src/app/vault/page.tsx`, `src/lib/actions/vault.ts` | Password manager with AES-256-GCM encryption and 1-click copy to clipboard. |
| **Settings** | `/settings` | `src/app/settings/page.tsx`, `src/lib/actions/users.ts` | Admin controls, session monitoring, profile updates, and logout actions. |

---

## 3. UI/UX Design System & Global Behaviors

- **Design Aesthetic:** Premium Office 365-style glassmorphism.
- **Themes:** Supports `light | dark | system` using CSS variable tokens defined in `globals.css`. Light theme uses a high-contrast `slate` color palette.
- **Responsive Layout:**
  - **Desktop:** Sticky sidebar with Gemini-style collapse/expand toggle.
  - **Mobile (<768px):** Hamburger Sheet (Radix Dialog) navigation.
- **Popup/Modal Architecture:** Nearly all CRUD forms (create task, edit event, manage user, markdown editor) open inside standard Shadcn UI `<Dialog>` components to maintain a seamless Single Page Application feel.
- **Cross-cutting Concerns:**
  - **Multi-tenant isolation:** Every DB mutation chains `eq(<table>.userId, session.userId)` to guarantee users only access their own data.
  - **URL State:** The `nuqs` library syncs filters and active IDs directly to the URL without full React re-renders.
  - **Background Cleanup:** A cron route `GET /api/cron/overdue` runs hourly via Vercel Cron to permanently delete trashed notes and old tasks/events.

---

## 4. Known Technical Debt & Architectural Trade-offs

- **`react-hooks/set-state-in-effect` Suppression:** Used intentionally in a few locations for localStorage hydration, derived-state sync, and route-change drawer close. Each has an inline rationale comment.
- **No Optimistic UI on Mutations:** Server actions use `next-safe-action`'s `useAction` hook. UI updates currently wait for `revalidatePath` round-trips. Wrapping mutations with `useOptimistic` is a future consideration for low-latency targets.
- **Seed Script DB Access:** `pnpm db:seed` (`src/lib/db/seed.ts`) must be run locally with `DATABASE_URL` set. There is no in-app "bootstrap" route for fresh deployments yet.

---

## 5. Environment Variables

| Variable | Source | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Neon → Connection String | ✅ | Pooled serverless URL |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | ✅ | Min 32 chars |
| `NEXT_PUBLIC_APP_URL` | Vercel project URL | ✅ | e.g. `http://localhost:3000` |
| `CRON_SECRET` | Generate: `openssl rand -hex 20` | ✅ (prod) | Header: `Authorization: Bearer <secret>` |
| `SUDO_PASSWORD` | Any strong string | ✅ | Guards admin user CRUD |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | ❌ (Opt) | For Document Storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase Anon Key | ❌ (Opt) | For Document Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Key | ❌ (Opt) | For internal signed URLs |

---

## 6. Recent Work & Active Tasks

### ✅ Phase 3.7 — Infrastructure & Stability Fixes (Completed 2026-06-10)
- **Next.js Cross-Origin Fix:** Configured `allowedDevOrigins` in `next.config.ts` to include local LAN IPs (`172.16.*`, `192.168.*`) preventing HMR blocked requests during local network testing.
- **Storage Strategy Solidified:** Document module confirmed to successfully generate signed URLs directly against Supabase via Server Actions (`src/lib/actions/documents.ts`), persisting size and MIME type metadata accurately in Drizzle.
- **Context Rewritten:** Upgraded this document (`context.md`) to deeply reflect the architectural constraints, UI systems, and schema of the live project.

### ✅ Phase 3.8 — UI Refinement & Standardization (Completed 2026-06-10)
- **Minimalist Form Aesthetics:** Standardized the UI design language across all dialogs and forms (Authentication, Settings, Admin, Calendar, and Documents) to use a clean, placeholder-based approach inspired by the Vault module. Explicit `<label>` elements were removed in favor of descriptive input placeholders, resulting in a cleaner and less cluttered interface.
