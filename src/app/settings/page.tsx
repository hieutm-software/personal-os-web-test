import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
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

  // Fetch data based on role
  type SettingsUser = { id: string; username: string; role: "USER" | "ADMIN"; createdAt: string };
  type SessionItem = { id: string; userId: string; device: string | null; ip: string | null; location: string | null; loginAt: string; username?: string | null };

  let allUsers: SettingsUser[] = [];

  if (isAdmin) {
    allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);
  }

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
      allUsers={allUsers}
      allSessions={allSessions}
      currentUserId={session.userId}
    />
  );
}
