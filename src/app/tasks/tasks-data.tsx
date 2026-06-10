// Server Component: fetches tasks data and renders TasksClient.
// Placed here so Next.js can stream the outer shell (page.tsx) instantly
// while this component loads asynchronously.

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TasksClient } from "./tasks-client";

export async function TasksData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.userId))
    .orderBy(desc(tasks.createdAt));

  return <TasksClient initialTasks={userTasks} />;
}
