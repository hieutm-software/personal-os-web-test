import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  // 1. Authenticate and extract boundary
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  // 2. Fetch data strictly enforcing User ID isolation
  const userEvents = await db
    .select()
    .from(events)
    .where(eq(events.userId, session.userId));

  // 3. Hydrate client
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <CalendarClient initialEvents={userEvents} />
      </div>
    </div>
  );
}
