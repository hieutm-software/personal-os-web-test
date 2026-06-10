"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { and, eq, inArray, isNotNull, isNull, like } from "drizzle-orm";
import { createSafeActionClient } from "next-safe-action";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkNeonQuota } from "./quota";

const actionClient = createSafeActionClient();

// ============================================================================
// SCHEMAS
// ============================================================================

const createNoteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().optional(),
  content: z.string().default(""), // Can store Text, JSON, or Markdown
});

const updateNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  content: z.string().optional(),
});

const deleteNoteSchema = z.object({
  id: z.string().uuid(),
});

const bulkDeleteNoteSchema = z.object({
  ids: z.array(z.string().uuid()),
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

export const createNoteAction = actionClient
  .schema(createNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getAuthenticatedUser();

      const approxBytes = (parsedInput.title?.length || 0) + parsedInput.content.length;
      const hasQuota = await checkNeonQuota(session.userId, approxBytes);
      if (!hasQuota) {
        return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
      }

      const baseTitle = parsedInput.title || "Untitled";
      let finalTitle = baseTitle;

      // Auto-naming logic: Query existing titles that start with baseTitle to find conflicts
      const existingNotes = await db
        .select({ title: notes.title })
        .from(notes)
        .where(
          and(
            eq(notes.userId, session.userId),
            isNull(notes.deletedAt),
            like(notes.title, `${baseTitle}%`)
          )
        );

      const titles = new Set(existingNotes.map((n) => n.title));
      if (titles.has(baseTitle)) {
        let i = 1;
        while (titles.has(`${baseTitle} ${i}`)) {
          i++;
        }
        finalTitle = `${baseTitle} ${i}`;
      }

      const noteIdToUse = parsedInput.id || crypto.randomUUID();

      const [newNote] = await db
        .insert(notes)
        .values({
          id: noteIdToUse,
          userId: session.userId,
          title: finalTitle,
          content: parsedInput.content,
        })
        .returning({ id: notes.id });

      revalidatePath("/notes");
      return { success: true, noteId: newNote.id };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to create note" };
    }
  });

export const updateNoteAction = actionClient
  .schema(updateNoteSchema)
  .action(async ({ parsedInput: { id, ...updates } }) => {
    try {
      const session = await getAuthenticatedUser();

      const approxBytes = (updates.title?.length || 0) + (updates.content?.length || 0);
      if (approxBytes > 0) {
        const hasQuota = await checkNeonQuota(session.userId, approxBytes);
        if (!hasQuota) {
          return { failure: "NeonDB storage limit of 150MB exceeded. Please delete some items." };
        }
      }

      // STRICT DATA ISOLATION
      const result = await db
        .update(notes)
        .set({ ...updates, updatedAt: new Date().toISOString() })
        .where(and(eq(notes.id, id), eq(notes.userId, session.userId)))
        .returning({ updatedId: notes.id });

      if (result.length === 0) {
        return { failure: "Note not found or access denied" };
      }

      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to save note" };
    }
  });

export const deleteNoteAction = actionClient
  .schema(deleteNoteSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      // STRICT DATA ISOLATION (SOFT DELETE)
      const result = await db
        .update(notes)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(notes.id, id), eq(notes.userId, session.userId)))
        .returning({ deletedId: notes.id });

      if (result.length === 0) {
        return { failure: "Note not found or access denied" };
      }

      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete note" };
    }
  });

export const restoreNoteAction = actionClient
  .schema(deleteNoteSchema) // re-use id schema
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      const result = await db
        .update(notes)
        .set({ deletedAt: null })
        .where(and(eq(notes.id, id), eq(notes.userId, session.userId)))
        .returning({ restoredId: notes.id });

      if (result.length === 0) {
        return { failure: "Note not found or access denied" };
      }

      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to restore note" };
    }
  });

export const permanentDeleteNoteAction = actionClient
  .schema(deleteNoteSchema)
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getAuthenticatedUser();

      const result = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, session.userId)))
        .returning({ deletedId: notes.id });

      if (result.length === 0) {
        return { failure: "Note not found or access denied" };
      }

      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete note" };
    }
  });

export const emptyTrashAction = actionClient
  .action(async () => {
    try {
      const session = await getAuthenticatedUser();

      // Delete all soft-deleted notes for this user
      await db
        .delete(notes)
        .where(
          and(
            eq(notes.userId, session.userId),
            isNotNull(notes.deletedAt)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to empty trash" };
    }
  });

export const deleteAllNotesAction = actionClient
  .action(async () => {
    try {
      const session = await getAuthenticatedUser();

      // Soft delete all active notes for this user
      await db
        .update(notes)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(notes.userId, session.userId),
            isNull(notes.deletedAt)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to delete all notes" };
    }
  });

export const bulkDeleteNotesAction = actionClient
  .schema(bulkDeleteNoteSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();
      if (ids.length === 0) return { success: true };

      // Soft delete selected notes
      await db
        .update(notes)
        .set({ deletedAt: new Date().toISOString() })
        .where(
          and(
            eq(notes.userId, session.userId),
            inArray(notes.id, ids)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to bulk delete notes" };
    }
  });

export const restoreAllNotesAction = actionClient
  .action(async () => {
    try {
      const session = await getAuthenticatedUser();

      await db
        .update(notes)
        .set({ deletedAt: null })
        .where(
          and(
            eq(notes.userId, session.userId),
            isNotNull(notes.deletedAt)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to restore all notes" };
    }
  });

export const bulkRestoreNotesAction = actionClient
  .schema(bulkDeleteNoteSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();
      if (ids.length === 0) return { success: true };

      await db
        .update(notes)
        .set({ deletedAt: null })
        .where(
          and(
            eq(notes.userId, session.userId),
            inArray(notes.id, ids)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to bulk restore notes" };
    }
  });

export const bulkPermanentDeleteNotesAction = actionClient
  .schema(bulkDeleteNoteSchema)
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getAuthenticatedUser();
      if (ids.length === 0) return { success: true };

      await db
        .delete(notes)
        .where(
          and(
            eq(notes.userId, session.userId),
            inArray(notes.id, ids)
          )
        );
      
      revalidatePath("/notes");
      return { success: true };
    } catch (error) {
      return { failure: error instanceof Error ? error.message : "Failed to bulk permanently delete notes" };
    }
  });
