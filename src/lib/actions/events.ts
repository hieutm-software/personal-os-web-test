"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createSafeActionClient } from "next-safe-action";

import { cookies } from "next/headers";
import { z } from "zod";
import { checkNeonQuota } from "./quota";
import crypto from "crypto";

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const actionClient = createSafeActionClient();

// Support standard recurrence strings (e.g., RRULE: FREQ=WEEKLY;BYDAY=MO,WE,FR)
const createEventSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    startTime: z
      .string()
      .datetime("Start time must be a valid ISO 8601 UTC date")
      .optional()
      .nullable(),
    endTime: z
      .string()
      .datetime("End time must be a valid ISO 8601 UTC date")
      .optional()
      .nullable(),
    recurrence: z.string().optional().nullable(),
  })
  .refine((data) => {
    if (data.startTime && data.endTime) {
      return new Date(data.startTime) <= new Date(data.endTime);
    }
    return true;
  }, {
    message: "End time cannot be earlier than start time",
    path: ["endTime"],
  });

const updateEventSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  recurrence: z.string().optional().nullable(),
});

const deleteEventSchema = z.object({
  id: z.string().uuid(),
});

const bulkDeleteEventsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one event ID is required"),
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

export const createEventAction = actionClient
  .schema(createEventSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getAuthenticatedUser();

      const approxBytes = (parsedInput.title?.length || 0) + (parsedInput.description?.length || 0);
      if (approxBytes > 0) {
        const hasQuota = await checkNeonQuota(session.userId, approxBytes);
        if (!hasQuota) {
          return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
        }
      }

      // INSERT: Automatically bound to the authenticated user's ID
      await db.insert(events).values({
        id: parsedInput.id || crypto.randomUUID(),
        userId: session.userId,
        title: parsedInput.title,
        description: parsedInput.description,
        startTime: parsedInput.startTime,
        endTime: parsedInput.endTime,
        recurrence: parsedInput.recurrence,
      });

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to create event" };
    }
  });

export const updateEventAction = actionClient
  .schema(updateEventSchema)
  .action(async ({ parsedInput: { id, ...updates } }) => {
    try {
      const session = await getAuthenticatedUser();

      // Validate chronological order if both times are being updated
      if (updates.startTime && updates.endTime) {
        if (new Date(updates.startTime) > new Date(updates.endTime)) {
          return { failure: "End time cannot be earlier than start time" };
        }
      }

      const approxBytes = (updates.title?.length || 0) + (updates.description?.length || 0);
      if (approxBytes > 0) {
        const hasQuota = await checkNeonQuota(session.userId, approxBytes);
        if (!hasQuota) {
          return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
        }
      }

      // STRICT DATA ISOLATION: Enforce userId matching on update mutations
      const result = await db
        .update(events)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(and(eq(events.id, id), eq(events.userId, session.userId)))
        .returning({ updatedId: events.id });

      if (result.length === 0) {
        return { failure: "Event not found or access denied" };
      }

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to update event" };
    }
  });

export const deleteEventAction = actionClient
  .schema(deleteEventSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      // STRICT DATA ISOLATION: Enforce userId matching on deletion mutations
      const result = await db
        .delete(events)
        .where(and(eq(events.id, id), eq(events.userId, session.userId)))
        .returning({ deletedId: events.id });

      if (result.length === 0) {
        return { failure: "Event not found or access denied" };
      }

      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete event" };
    }
  });

export const bulkDeleteEventsAction = actionClient
  .schema(bulkDeleteEventsSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();
      
      const { inArray } = await import("drizzle-orm");
      
      const result = await db
        .delete(events)
        .where(and(inArray(events.id, ids), eq(events.userId, session.userId)))
        .returning({ deletedId: events.id });

      if (result.length === 0) {
        return { failure: "No events found or access denied" };
      }

      return { success: true, count: result.length };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to bulk delete events" };
    }
  });
