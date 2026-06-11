# Personal OS - Master System Context

This document compiles the system architecture, technology stack, and coding standards of the Personal OS project. Any AI Agent interacting with this codebase MUST strictly adhere to these rules.

## A. Tech Stack & Infrastructure
* **Framework:** Next.js `16.2.7` (App Router)
* **Frontend:** React `19.2.4`, DOM `19.2.4`
* **Styling:** Tailwind CSS `^4.0.0` (via `@tailwindcss/postcss`), Radix UI
* **Database & ORM:** Neon DB Serverless (`@neondatabase/serverless 1.1.0`), Drizzle ORM `0.45.2`, Drizzle Zod `0.8.3`
* **Storage:** Supabase Storage (`@supabase/supabase-js 2.107.0`)
* **PWA:** Serwist (`@serwist/next 9.5.11`)
* **Authentication:** Edge JWT using `jose` `6.2.3` (HTTP-only cookies)
* **Server Actions:** `next-safe-action` `8.5.3`
* **State Management (URL):** `nuqs` `2.8.9` (shallow routing)

## B. Database Schema & Data Flow
### Core Tables
* `users`: `id`, `username`, `email`, `passwordHash`, `role` (USER/ADMIN)
* `verification_tokens`: Email OTPs (`email`, `token`, `expiresAt`)
* `sessions`: Active device login sessions (`device`, `ip`, `location`)
* `tasks`: Task management (`userId`, `title`, `status`)
* `events`: Event management (`userId`, `title`, `description`, `startTime`, `endTime`, `recurrence`)
* `notes`: Note management (`userId`, `title`, `content`)
* `document_folders` & `documents`: File system tree and metadata
* `vault`: Encrypted password storage (`userId`, `platform`, `username`, `passwordEncrypted`, `note`)

### Client/Server Boundary (Data Flow)
* **Payload Rules:** Server Components MUST filter out sensitive or unnecessary fields before passing data to Client Components (e.g., using `Omit<Type, "userId">` for DB objects before passing them to `*-client.tsx` via initialData).
* All data mutations sent from Client to Server MUST be handled by `next-safe-action` (schema validation via Zod).

## C. Authentication & Security Model (CRITICAL)
* **Auth Flow:** Uses JWT signed by the `jose` library to ensure Edge Runtime compatibility. Tokens are stored in `HTTP-only`, `Secure`, `SameSite=Lax` cookies.
* **Server Actions & API:** 100% of secured Server Actions and APIs MUST call `getSession()` to verify the current user's identity. (API Route Handlers manually use `verifySessionToken` via cookies).
* **Multi-tenant Data Isolation:** ALL Drizzle queries (Select, Update, Delete) on user data (Tasks, Events, Notes, Vault, Documents) MUST enforce the `eq(table.userId, session.userId)` condition to prevent privilege escalation.
* **Dual-layer Encryption (Vault):**
  * **Layer 1 (Client-side):** Uses WebCrypto API (PBKDF2 to derive keys from the Master Password, AES-GCM encryption) in `crypto-client.ts` or via Web Worker (`crypto.worker.ts`) to ensure zero-knowledge architecture.
  * **Layer 2 (Server-side):** Fallback/Supplementary server-tier encryption within Server Actions (`vault.ts`) utilizing Node crypto primitives when necessary.

## D. UI Architecture & State Management
* **Streaming & Suspense Pattern:** Render flow strictly follows:
  `page.tsx` (Skeleton/Suspense boundary) -> `*-data.tsx` (Server Component handling parallel data fetching) -> `*-client.tsx` (Client Component receiving initial data, managing UI/interactions).
* **URL State Management:** Uses the `nuqs` library with `{ shallow: true }` to sync states (e.g., search queries, filters) to the URL without triggering full page re-renders or losing focus.
* **Optimistic UI:** Leverages `useOptimistic` (React 19) in tandem with Server Actions. The UI updates instantly via custom hooks (`useOptimisticEvents`, `useOptimisticTasks`); if an Action fails, the UI rolls back automatically. Avoids abusing `revalidatePath` to prevent heavy full-page re-renders.

## E. Architectural Trade-offs (Intentional Exceptions)
The following areas have intentional linter bypasses due to architectural decisions. They MUST NOT be modified arbitrarily (modifying them will cause regressions):
* **`eslint-disable-next-line react-hooks/set-state-in-effect` (13 instances):** Scattered across `*-client.tsx` and layout components. Used to sync state from the URL, Local Storage, or handle Hydration mismatches between Server and Client.
* **`eslint-disable-next-line react-hooks/incompatible-library` (2 instances):** In `tasks-client.tsx` and `vault-client.tsx`, stemming from the `@tanstack/react-virtual` (`useVirtualizer`) library's current incompatibility with React 19.
* **`/* eslint-disable-next-line @next/next/no-img-element */` (2 instances):** In `document-viewer.tsx` and `page.tsx`. Intentionally using the standard `<img>` tag to guarantee absolute compatibility with custom styling for image previews, as `next/image` breaks the layout requirements here.
* **`@ts-expect-error`:** Resolved via module augmentation in `types.d.ts` for `webkitdirectory` and `serwist` to ensure safe type-checking without `@ts-expect-error`.
