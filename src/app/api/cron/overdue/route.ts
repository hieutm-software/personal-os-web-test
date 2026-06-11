import { db } from "@/lib/db";
import { events, notes, tasks } from "@/lib/db/schema";
import { and, isNotNull, lt } from "drizzle-orm";
import { subDays } from "date-fns";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ============================================================================
// CRON JOB: Data Retention Scanner
// Executes hourly via Vercel Cron. Deletes old data (e.g. tasks/events > 30 days, notes in trash > 14 days).
// ============================================================================

export async function GET(request: NextRequest) {
  // 1. Security Authorization: Validate the invocation comes from Vercel
  const authHeader = request.headers.get("authorization");

  // In production, strictly enforce the CRON_SECRET mapped in Vercel environment variables.
  // In development, allow bypass for local testing if the secret isn't defined.
  if (process.env.NODE_ENV === "production") {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or missing CRON_SECRET",
        },
        { status: 401 },
      );
    }
  }

  try {

    // 2. Query target tasks:
    // - Status is NOT 'COMPLETED'
    // - Due Date is in the past
    // - Title does not already start with '[OVERDUE]'
    // 2. Data Retention: Delete tasks and events older than 30 days, and notes in trash older than 14 days
    const retentionThreshold30 = subDays(new Date(), 30).toISOString();
    const retentionThreshold14 = subDays(new Date(), 14).toISOString();
    
    const [deletedTasks, deletedEvents, deletedNotes] = await Promise.all([
      db.delete(tasks).where(lt(tasks.createdAt, retentionThreshold30)).returning({ id: tasks.id }),
      db.delete(events).where(lt(events.createdAt, retentionThreshold30)).returning({ id: events.id }),
      db.delete(notes).where(and(isNotNull(notes.deletedAt), lt(notes.deletedAt, retentionThreshold14))).returning({ id: notes.id })
    ]);

    return NextResponse.json(
      {
        success: true,
        deletedTasksCount: deletedTasks.length,
        deletedEventsCount: deletedEvents.length,
        deletedNotesCount: deletedNotes.length,
        message: `Deleted ${deletedTasks.length} tasks, ${deletedEvents.length} events older than 30 days, and ${deletedNotes.length} notes from trash.`,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Cron Execution Failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error during execution payload",
      },
      { status: 500 },
    );
  }
}
