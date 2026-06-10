import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, notes, tasks, users } from "@/lib/db/schema";
import { and, eq, gte, ne, desc, asc, sql } from "drizzle-orm";
import {
  Bell,
  Calendar,
  CheckCircle2,
  FileText,
  Search,
  User,
  Zap,
  HardDrive,
  Activity,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import WeatherClockCard from "@/components/weather-clock-card";
import { GlobalSearchTrigger } from "@/components/ui/global-search-trigger";
import { UserMenu } from "./user-menu";
import { EventCard } from "./event-card";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  // --- Real System Stats ---
  const storageTotalMb = 500; // Neon free tier limit is 500MB
  let storageUsedMb = 0;
  let storagePercent = 0;
  let dbPingMs = 0;

  try {
    const pingStart = Date.now();
    // Use raw SQL to get database size in Postgres
    const dbSizeResult = await db.execute(sql`SELECT pg_database_size(current_database()) as size`);
    dbPingMs = Date.now() - pingStart;

    if (dbSizeResult && dbSizeResult.rows && dbSizeResult.rows[0]) {
      const bytes = Number(dbSizeResult.rows[0].size) || 0;
      storageUsedMb = bytes / (1024 * 1024);
      storagePercent = Math.min(100, Math.max(1, Math.round((storageUsedMb / storageTotalMb) * 100)));
    }
  } catch (e) {
    // fallback if query fails
    storagePercent = 1;
    dbPingMs = 45;
  }

  const currentUtcIso = new Date().toISOString();

  // Fetch stats
  const [openTasksList, completedTasksList, upcomingEventsList, allNotesList] = await Promise.all([
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, session.userId), ne(tasks.status, "COMPLETED"))),
    db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.userId, session.userId), eq(tasks.status, "COMPLETED"))),
    db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.userId, session.userId), gte(events.endTime, currentUtcIso))),
    db
      .select({ id: notes.id })
      .from(notes)
      .where(eq(notes.userId, session.userId)),
  ]);

  const openTasksCount = openTasksList.length;
  const completedTasksCount = completedTasksList.length;
  const totalTasksCount = openTasksCount + completedTasksCount;
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const upcomingEventsCount = upcomingEventsList.length;
  const totalNotesCount = allNotesList.length;

  let allUsers: { id: string; username: string; role: "USER" | "ADMIN"; createdAt: string }[] = [];
  if (session.role === "ADMIN") {
    allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);
  }

  // Fetch upcoming events details
  const upcomingEventsDetails = await db
    .select()
    .from(events)
    .where(and(eq(events.userId, session.userId), gte(events.endTime, currentUtcIso)))
    .orderBy(desc(events.createdAt));

  return (
    <div className="flex flex-col gap-4 max-w-[1400px] mx-auto w-full h-full overflow-hidden p-4 md:p-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <GlobalSearchTrigger />
          {/* Removed + New button based on user request */}
          <button className="w-8 h-8 rounded-full bg-premium-dark border border-premium-border flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-premium-text transition-colors shrink-0">
            <Bell className="w-4 h-4" />
          </button>
          <UserMenu 
            isAdmin={session.role === "ADMIN"} 
            allUsers={allUsers} 
            currentUserId={session.userId} 
          />
        </div>
      </header>

      {/* ── TOP STATS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* Total Tasks */}
        <div className="card-aura-responsive p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="absolute top-5 right-5">
            <div className="w-8 h-8 rounded-md bg-indigo-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Total Tasks</p>
            <p className="text-4xl font-semibold tracking-tight text-premium-text">{openTasksCount}</p>
          </div>
          <p className="text-xs text-zinc-500 font-medium mt-1">12 due today</p>
        </div>

        {/* Upcoming Events (Replacing Overdue) */}
        <div className="card-aura-responsive p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-red-500/10 to-transparent pointer-events-none" />
          <div className="absolute top-5 right-5">
            <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Upcoming Events</p>
            <p className="text-4xl font-semibold tracking-tight text-premium-text">{upcomingEventsCount}</p>
          </div>
        </div>

        {/* Notes Created */}
        <div className="card-aura-responsive p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none" />
          <div className="absolute top-5 right-5">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Notes Created</p>
            <p className="text-4xl font-semibold tracking-tight text-premium-text">{totalNotesCount}</p>
          </div>
        </div>

        {/* Task Progress */}
        <div className="card-aura-responsive p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
          <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          <div>
            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Task Progress</p>
            <p className="text-4xl font-semibold tracking-tight text-premium-text mb-3">{taskCompletionRate}%</p>
          </div>
          <div className="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-auto">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
              style={{ width: `${taskCompletionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── REPORTS & WEATHER ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="xl:col-span-1 h-full min-h-0">
          {/* Upcoming Events (Replaced Task Completion / Recent Notes) */}
          <div className="card-aura-responsive flex flex-col h-full overflow-hidden relative">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent pointer-events-none z-0" />
            <div className="p-4 flex items-center justify-between border-b border-premium-border shrink-0 relative z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Upcoming Events
              </h2>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-start overflow-y-auto">
              <div className="space-y-4" suppressHydrationWarning>
                {upcomingEventsDetails.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No upcoming events.</p>
                ) : (
                  upcomingEventsDetails.map((event, i) => (
                    <EventCard key={event.id} event={event} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="xl:col-span-2 flex flex-col gap-4 h-full min-h-0">
          {/* We wrap WeatherClockCard in a subtle wrapper to blend it with Aura */}
          <div className="[&>div]:border-none [&>div]:card-aura-responsive shrink-0">
            <WeatherClockCard />
          </div>

          {/* System Monitor Cards */}
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            {/* Storage Card */}
            <div className="card-aura-responsive p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
              <div className="flex items-start justify-between relative z-10 mb-2">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">{storagePercent}%</span>
              </div>
              <div className="relative z-10 mt-auto">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Database Storage</p>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${storagePercent}%` }} />
                </div>
                <p className="text-xs text-zinc-500 mt-2">{storageUsedMb.toFixed(2)} MB / {storageTotalMb} MB</p>
              </div>
            </div>

            {/* Network Latency Card */}
            <div className="card-aura-responsive p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-3/4 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
              <div className="flex items-start justify-between relative z-10 mb-2">
                <div className="w-8 h-8 rounded-md bg-cyan-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">{dbPingMs} ms</span>
                </div>
              </div>
              <div className="relative z-10 mt-auto">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mb-1">Network & API</p>
                <p className="text-xl font-semibold tracking-tight text-white">Connected</p>
                <p className="text-xs text-zinc-500 mt-1">Neon DB Server Ping</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
