import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarClient } from "./calendar-client";

export async function CalendarData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  // Explicit column selection — omits `userId` and `recurrence` (not rendered in calendar UI).
  const userEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      startTime: events.startTime,
      endTime: events.endTime,
      createdAt: events.createdAt,
      updatedAt: events.updatedAt,
    })
    .from(events)
    .where(eq(events.userId, session.userId));

  // Cast: client receives full Event shape minus userId + recurrence (unused in UI)
  return <CalendarClient initialEvents={userEvents as Parameters<typeof CalendarClient>[0]["initialEvents"]} />;
}
