import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, notes, tasks, users } from "@/lib/db/schema";
import { and, eq, gte, ne } from "drizzle-orm";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import WeatherClockCard from "@/components/weather-clock-card";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components (typed, no `any`)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  accentClass,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  accentClass: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card p-6 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200"
    >
      <div
        className={`p-3 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-200 ${accentClass}`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-3xl font-black tracking-tight leading-none mt-1">
          {value}
        </p>
      </div>
      <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Greeting based on local hour
// ─────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page (Server Component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // 1. Authenticate and enforce boundary
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const t = await getTranslations("Dashboard");
  const greeting = getGreeting();

  // 2. Fetch user details for personalised welcome
  const [currentUser] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const username = currentUser?.username ?? "User";
  const currentUtcIso = new Date().toISOString();

  // 3. Fetch quick stats (count only)
  const [openTasksList, completedTasksList, upcomingEventsList, totalNotesList] = await Promise.all(
    [
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.userId, session.userId), ne(tasks.status, "COMPLETED")),
        ),
      db
        .select({ id: tasks.id })
        .from(tasks)
        .where(
          and(eq(tasks.userId, session.userId), eq(tasks.status, "COMPLETED")),
        ),
      db
        .select({ id: events.id })
        .from(events)
        .where(
          and(
            eq(events.userId, session.userId),
            gte(events.endTime, currentUtcIso),
          ),
        ),
      db
        .select({ id: notes.id })
        .from(notes)
        .where(eq(notes.userId, session.userId)),
    ],
  );

  const openTasksCount = openTasksList.length;
  const completedTasksCount = completedTasksList.length;
  const totalTasksCount = openTasksCount + completedTasksCount;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const upcomingEventsCount = upcomingEventsList.length;
  const totalNotesCount = totalNotesList.length;



  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-4 md:space-y-6">

        {/* ── WELCOME BANNER ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm min-h-[180px] flex flex-col justify-end p-6 md:p-8">
          {/* Decorative gradient orbs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/8 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-primary/5 blur-2xl"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                Dashboard
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
              {greeting}, <span className="text-primary">{username}</span>!
            </h1>
            <p className="mt-1.5 text-muted-foreground font-medium text-sm md:text-base">
              {t("overview")}
            </p>
          </div>

          {/* Compact progress indicator row */}
          <div className="relative z-10 mt-5 flex flex-wrap gap-3">
            {openTasksCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                {openTasksCount} task{openTasksCount !== 1 ? "s" : ""} pending
              </div>
            )}
            {upcomingEventsCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5" />
                {upcomingEventsCount} event{upcomingEventsCount !== 1 ? "s" : ""}{" "}
                coming up
              </div>
            )}
          </div>
        </div>

        {/* ── QUICK STAT CARDS ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <StatCard
            label={t("openTasks")}
            value={openTasksCount}
            icon={LayoutDashboard}
            accentClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            href="/tasks"
          />
          <StatCard
            label={t("upcomingEvents")}
            value={upcomingEventsCount}
            icon={Calendar}
            accentClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            href="/calendar"
          />
          <StatCard
            label={t("totalNotes")}
            value={totalNotesCount}
            icon={FileText}
            accentClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            href="/notes"
          />
        </div>

        {/* ── REPORTS & PROGRESS ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          <div className="xl:col-span-1 h-full">
            {/* Task Completion Ring */}
            <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col items-center justify-center gap-6 glassmorphism h-full min-h-[160px]">
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center drop-shadow-sm">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="56" cy="56" r="46" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-secondary" />
                <circle
                  cx="56"
                  cy="56"
                  r="46"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray="289"
                  strokeDashoffset={289 - (289 * taskCompletionRate) / 100}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-1000 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-black tracking-tight">{taskCompletionRate}%</span>
              </div>
            </div>
            <div className="text-center xl:text-left">
              <h3 className="font-bold text-lg flex items-center justify-center xl:justify-start gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                Task Completion
              </h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                You have successfully completed <strong className="text-foreground">{completedTasksCount}</strong> out of <strong className="text-foreground">{totalTasksCount}</strong> tasks. Keep up the good work!
              </p>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 h-full">
          <WeatherClockCard />
        </div>
        </div>

      </div>
    </div>
  );
}
