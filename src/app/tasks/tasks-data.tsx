// Server Component: fetches tasks data and renders TasksClient.
// Placed here so Next.js can stream the outer shell (page.tsx) instantly
// while this component loads asynchronously.

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TasksClient } from "./tasks-client";

export async function TasksData() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.userId))
    .orderBy(desc(tasks.createdAt));

  return <TasksClient initialTasks={userTasks} />;
}
