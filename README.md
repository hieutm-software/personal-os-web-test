# Personal OS 🚀

Personal OS is a fully functional, self-hosted, personal operating system built with Next.js. It features a complete suite of modules to manage your digital life, including tasks, calendar events, markdown notes, document storage, and a secure password vault.

## 🌟 Key Features

- **Dashboard**: A sleek overview of your digital life with animated statistical charts.
- **Tasks**: Manage your todos with due dates, priorities, and status tracking.
- **Calendar**: A built-in event manager with a beautiful month-view and day-view modal.
- **Notes**: A full-fledged Markdown editor with live preview, autosave, file system (folders/files), and a recycle bin.
- **Documents**: Upload, manage, and preview files directly within the app (supports images, PDFs, videos, and more).
- **Password Vault**: A secure vault for your credentials, encrypted using AES-256-GCM.
- **Admin Panel**: Manage users, roles (ADMIN/USER), permissions, and monitor active login sessions.
- **Modern UI**: Polished glassmorphism design, supporting Dark, Light, and System themes, built on Tailwind CSS v4 and Shadcn UI.
- **i18n**: Full bilingual support (English / Vietnamese).

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Neon (Serverless Postgres) + Drizzle ORM
- **Auth**: Custom JWT-based authentication (`jose`) with HTTP-only cookies
- **Storage**: Local file system (via `fs`) and Supabase Storage support
- **UI**: Tailwind CSS v4 + Framer Motion + Shadcn UI primitives
- **Forms & Validation**: React Hook Form + Zod + `next-safe-action`

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd personal-os
```

### 2. Install dependencies

This project uses `pnpm` as the package manager.

```bash
pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and configure the following variables:

```env
# Database (Neon Serverless Postgres)
DATABASE_URL="postgres://<user>:<password>@<host>/<dbname>?sslmode=require"

# JWT Secret for Auth (Generate a strong 32+ character string)
JWT_SECRET="your-super-secret-jwt-key"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Admin fallback password (required for initial seed and critical admin tasks)
SUDO_PASSWORD="your-strong-sudo-password"

# Cron Secret (for Vercel Cron jobs)
CRON_SECRET="your-cron-secret"

# Supabase Storage (for Documents module)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 4. Database Setup

Push the database schema to your Neon database:

```bash
pnpm run db:push
```

Seed the database with the initial admin user (requires `SUDO_PASSWORD` to be set):

```bash
pnpm run db:seed
```

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. Log in using the default admin credentials (username: `admin`, password: `<your SUDO_PASSWORD>`).

## ☁️ Deployment (Vercel)

1. Push your code to a **Private** GitHub repository.
2. Go to [Vercel](https://vercel.com/) and import the project.
3. Add all your `.env.local` variables in the Vercel **Environment Variables** settings.
4. Click **Deploy**. Vercel will automatically detect the Next.js setup.
5. Setup a Vercel Cron job using the `vercel.json` file to run periodic cleanups (e.g., emptying the trash).

## 📄 License

This project is open-sourced under the MIT License.
