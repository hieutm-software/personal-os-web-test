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

  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.userId, session.userId));

  return <CalendarClient initialEvents={userEvents} />;
}
