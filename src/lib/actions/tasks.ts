"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkNeonQuota } from "./quota";
import crypto from "crypto";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const actionClient = createSafeActionClient();

const createTaskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, "Title is required").max(500, "Title too long"),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).default("PENDING"),
});

const updateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(500, "Title too long").optional(),
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
// NOTE: revalidatePath removed — optimistic UI keeps state in sync client-side.
// Server cache is refreshed on next navigation via Next.js default behavior.
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

      await db.insert(tasks).values({
        id: parsedInput.id || crypto.randomUUID(),
        userId: session.userId,
        title: parsedInput.title,
        status: parsedInput.status,
      });

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to create task" };
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

      const result = await db
        .update(tasks)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(and(eq(tasks.id, id), eq(tasks.userId, session.userId)))
        .returning({ updatedId: tasks.id });

      if (result.length === 0) {
        return { failure: "Task not found or access denied" };
      }

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to update task" };
    }
  });

export const deleteTaskAction = actionClient
  .schema(deleteTaskSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      const result = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, session.userId)))
        .returning({ deletedId: tasks.id });

      if (result.length === 0) {
        return { failure: "Task not found or access denied" };
      }

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete task" };
    }
  });

export const bulkDeleteTasksAction = actionClient
  .schema(bulkDeleteTasksSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();

      const result = await db
        .delete(tasks)
        .where(and(inArray(tasks.id, ids), eq(tasks.userId, session.userId)))
        .returning({ deletedId: tasks.id });

      if (result.length === 0) {
        return { failure: "No tasks found or access denied" };
      }

      return { success: true, count: result.length };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to bulk delete tasks" };
    }
  });
