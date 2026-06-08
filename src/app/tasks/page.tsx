import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  // 1. Authenticate and extract boundary
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  // 2. Fetch data strictly enforcing User ID isolation
  const userTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, session.userId))
    .orderBy(desc(tasks.createdAt));

  // 3. Hydrate client
  // Tasks uses a full-height master-detail layout — the outer wrapper
  // provides padding and constrains height to the viewport
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <TasksClient initialTasks={userTasks} />
      </div>
    </div>
  );
}
