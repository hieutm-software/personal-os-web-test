"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createSafeActionClient } from "next-safe-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkNeonQuota } from "./quota";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const actionClient = createSafeActionClient();

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
});

const deleteTaskSchema = z.object({
  id: z.string().uuid(),
});

const bulkDeleteTasksSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one task ID is required"),
});

// ============================================================================
// CORE: AUTH & ISOLATION
// ============================================================================

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) throw new Error("Unauthorized");

  const session = await verifySessionToken(token);
  if (!session) throw new Error("Unauthorized");

  return session;
}

// ============================================================================
// ACTIONS
// ============================================================================

export const createTaskAction = actionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getAuthenticatedUser();

      const approxBytes = parsedInput.title?.length || 0;
      if (approxBytes > 0) {
        const hasQuota = await checkNeonQuota(session.userId, approxBytes);
        if (!hasQuota) {
          return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
        }
      }

      // INSERT: Automatically bound to the authenticated user's ID
      await db.insert(tasks).values({
        userId: session.userId,
        title: parsedInput.title,
        status: parsedInput.status,
      });

      // Clear Next.js cache to hydrate the UI instantly
      revalidatePath("/tasks");
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { failure: error.message || "Failed to create task" };
    }
  });

export const updateTaskAction = actionClient
  .schema(updateTaskSchema)
  .action(async ({ parsedInput: { id, ...updates } }) => {
    try {
      const session = await getAuthenticatedUser();

      const approxBytes = updates.title?.length || 0;
      if (approxBytes > 0) {
        const hasQuota = await checkNeonQuota(session.userId, approxBytes);
        if (!hasQuota) {
          return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
        }
      }

      // STRICT DATA ISOLATION: Enforce userId matching on update mutations
      const result = await db
        .update(tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(and(eq(tasks.id, id), eq(tasks.userId, session.userId)))
        .returning({ updatedId: tasks.id });

      // If length is 0, the task either doesn't exist or belongs to another user
      if (result.length === 0) {
        return { failure: "Task not found or access denied" };
      }

      revalidatePath("/tasks");
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { failure: error.message || "Failed to update task" };
    }
  });

export const deleteTaskAction = actionClient
  .schema(deleteTaskSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      // STRICT DATA ISOLATION: Enforce userId matching on deletion mutations
      const result = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, session.userId)))
        .returning({ deletedId: tasks.id });

      // Prevent silent failures if malicious delete is attempted across tenants
      if (result.length === 0) {
        return { failure: "Task not found or access denied" };
      }

      revalidatePath("/tasks");
      return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { failure: error.message || "Failed to delete task" };
    }
  });

export const bulkDeleteTasksAction = actionClient
  .schema(bulkDeleteTasksSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();
      
      const { inArray } = await import("drizzle-orm");
      
      const result = await db
        .delete(tasks)
        .where(and(inArray(tasks.id, ids), eq(tasks.userId, session.userId)))
        .returning({ deletedId: tasks.id });

      if (result.length === 0) {
        return { failure: "No tasks found or access denied" };
      }

      revalidatePath("/tasks");
      return { success: true, count: result.length };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { failure: error.message || "Failed to bulk delete tasks" };
    }
  });
