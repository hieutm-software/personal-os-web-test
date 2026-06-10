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

  // Explicit column selection — omits `userId` which is not needed on the client.
  const userTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, session.userId))
    .orderBy(desc(tasks.createdAt));

  // Cast: client receives full Task shape minus userId (unused in UI)
  return <TasksClient initialTasks={userTasks as Parameters<typeof TasksClient>[0]["initialTasks"]} />;
}
