import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const isAdmin = session.role === "ADMIN";

  // Data fetching

  // Everyone only sees their own sessions
  const allSessions = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      device: sessions.device,
      ip: sessions.ip,
      location: sessions.location,
      loginAt: sessions.loginAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, session.userId))
    .orderBy(desc(sessions.loginAt));

  return (
    <SettingsClient
      isAdmin={isAdmin}
      allSessions={allSessions}
    />
  );
}
