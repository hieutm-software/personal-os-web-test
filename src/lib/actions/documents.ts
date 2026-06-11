"use server";

import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { z } from "zod";
import { eq, and, inArray, isNotNull, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { actionClient } from "./client";

// Extracts the Supabase storage path from a document URL.
const extractSupabasePath = (url: string) => {
  // Handle the secure local API format
  if (url.startsWith("/api/files?path=")) {
    try {
      const urlObj = new URL(url, "http://localhost");
      const pathParam = urlObj.searchParams.get("path");
      if (pathParam) return pathParam;
    } catch {
      // Ignore URL parsing errors
    }
  }

  // Fallback for previous public bucket format (just in case)
  const bucketPrefix = "/storage/v1/object/public/personal-os-bucket/";
  const index = url.indexOf(bucketPrefix);
  if (index !== -1) {
    return url.substring(index + bucketPrefix.length);
  }
  return null;
};

// ---------------------------------------------------------------------------
// Wraps any promise with a hard timeout to prevent Supabase calls from
// hanging indefinitely if the storage service is slow or unreachable.
// ---------------------------------------------------------------------------
const SUPABASE_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number = SUPABASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Storage request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Helper: delete Supabase file (shared by permanent delete actions).
// Falls back gracefully if the path cannot be determined.
// ---------------------------------------------------------------------------
async function deleteStorageFile(url: string): Promise<void> {
  const supabasePath = extractSupabasePath(url);
  if (supabasePath) {
    await withTimeout(supabase.storage.from("personal-os-bucket").remove([supabasePath]));
  }
}

// ============================================================================
// UPLOAD ACTIONS
// ============================================================================

export const getUploadUrlAction = actionClient
  .schema(z.object({
    name: z.string().min(1),
    sizeBytes: z.number().min(0),
    folderId: z.string().uuid().nullable().optional(),
  }))
  .action(async ({ parsedInput: { name, sizeBytes } }) => {
    try {
      const session = await getSession();

      const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
      const MAX_TOTAL_STORAGE = 300 * 1024 * 1024; // 300MB

      if (sizeBytes > MAX_FILE_SIZE) {
        return { failure: "File size exceeds the 25MB limit." };
      }

      const [result] = await db
        .select({ total: sum(documents.sizeBytes) })
        .from(documents)
        .where(eq(documents.userId, session.userId));
      const totalUsed = Number(result?.total || 0);

      if (totalUsed + sizeBytes > MAX_TOTAL_STORAGE) {
        return { failure: "Total storage limit of 300MB exceeded." };
      }

      // Use crypto.randomUUID() instead of uuid package (built-in, no dependency needed)
      const ext = name.includes(".") ? name.substring(name.lastIndexOf(".")) : "";
      const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}${ext}`;
      const supabasePath = `${session.userId}/${uniqueFilename}`;

      const { data, error } = await withTimeout(
        supabase.storage
          .from("personal-os-bucket")
          .createSignedUploadUrl(supabasePath)
      );

      if (error || !data) {
        console.error("Supabase signed URL error:", error);
        return { failure: "Failed to generate upload URL" };
      }

      return { success: true, signedUrl: data.signedUrl, token: data.token, supabasePath };
    } catch (e) {
      console.error("Failed to generate signed URL", e);
      return { failure: e instanceof Error ? e.message : "Upload failed" };
    }
  });

export const finalizeUploadAction = actionClient
  .schema(z.object({
    supabasePath: z.string().min(1),
    name: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().min(0),
    folderId: z.string().uuid().nullable().optional(),
  }))
  .action(async ({ parsedInput: { supabasePath, name, mimeType, sizeBytes, folderId } }) => {
    try {
      const session = await getSession();

      // Basic security validation: path must start with userId
      if (!supabasePath.startsWith(`${session.userId}/`)) {
        return { failure: "Unauthorized path" };
      }

      const localApiUrl = `/api/files?path=${encodeURIComponent(supabasePath)}`;

      await db.insert(documents).values({
        userId: session.userId,
        folderId: folderId || null,
        name,
        sizeBytes,
        mimeType,
        url: localApiUrl,
      });

      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      console.error("Database insert failed", e);
      return { failure: e instanceof Error ? e.message : "Database record creation failed" };
    }
  });

// ============================================================================
// DOCUMENT CRUD ACTIONS
// ============================================================================

export const deleteDocumentAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getSession();

      const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, session.userId))).limit(1);
      if (!doc) return { failure: "Not found" };

      await db.update(documents)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(documents.id, id), eq(documents.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to delete document" };
    }
  });

export const bulkDeleteDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getSession();

      await db.update(documents)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to bulk delete documents" };
    }
  });

export const renameDocumentAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }))
  .action(async ({ parsedInput: { id, name } }) => {
    try {
      const session = await getSession();

      await db.update(documents)
        .set({ name, updatedAt: new Date().toISOString() })
        .where(and(eq(documents.id, id), eq(documents.userId, session.userId)));

      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to rename document" };
    }
  });

export const moveDocumentAction = actionClient
  .schema(z.object({
    documentId: z.string().uuid(),
    folderId: z.string().uuid().nullable(),
  }))
  .action(async ({ parsedInput: { documentId, folderId } }) => {
    try {
      const session = await getSession();

      await db.update(documents)
        .set({ folderId, updatedAt: new Date().toISOString() })
        .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to move document" };
    }
  });

export const updateDocumentContentAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    content: z.string(),
  }))
  .action(async ({ parsedInput: { id, content } }) => {
    try {
      const session = await getSession();

      const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, session.userId))).limit(1);
      if (!doc) return { failure: "Not found" };

      const supabasePath = extractSupabasePath(doc.url);
      if (!supabasePath) {
        return { failure: "Cannot determine storage path for this document" };
      }

      const buffer = Buffer.from(content, "utf-8");

      const { error } = await withTimeout(
        supabase.storage
          .from("personal-os-bucket")
          .upload(supabasePath, buffer, {
            contentType: doc.mimeType,
            upsert: true,
          })
      );
      if (error) {
        console.error("Supabase update error:", error);
        return { failure: "Failed to update document content in storage" };
      }

      await db.update(documents)
        .set({
          sizeBytes: buffer.length,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(documents.id, id), eq(documents.userId, session.userId)));

      revalidatePath("/documents");
      return { success: true, newSize: buffer.length };
    } catch (e) {
      console.error("Failed to update document content", e);
      return { failure: e instanceof Error ? e.message : "Update failed" };
    }
  });

// ============================================================================
// FOLDER CRUD ACTIONS
// ============================================================================

export const createFolderAction = actionClient
  .schema(z.object({
    name: z.string().min(1),
    parentId: z.string().uuid().nullable().optional(),
  }))
  .action(async ({ parsedInput: { name, parentId } }) => {
    try {
      const session = await getSession();

      const [newFolder] = await db.insert(documentFolders).values({
        userId: session.userId,
        name,
        parentId: parentId || null,
      }).returning({ id: documentFolders.id });
      revalidatePath("/documents");
      return { success: true, folderId: newFolder.id };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to create folder" };
    }
  });

export const renameFolderAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }))
  .action(async ({ parsedInput: { id, name } }) => {
    try {
      const session = await getSession();

      await db.update(documentFolders)
        .set({ name, updatedAt: new Date().toISOString() })
        .where(and(eq(documentFolders.id, id), eq(documentFolders.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to rename folder" };
    }
  });

export const deleteFolderAction = actionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      const session = await getSession();

      // Soft Delete documents in DB
      await db.update(documents)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(documents.folderId, id), eq(documents.userId, session.userId)));

      // Soft Delete the folder
      await db.update(documentFolders)
        .set({ deletedAt: new Date().toISOString() })
        .where(and(eq(documentFolders.id, id), eq(documentFolders.userId, session.userId)));

      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to delete folder" };
    }
  });

// ============================================================================
// RESTORE ACTIONS
// ============================================================================

export const restoreDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getSession();

      if (ids.length > 0) {
        await db.update(documents)
          .set({ deletedAt: null })
          .where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
      }
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to restore documents" };
    }
  });

export const restoreFoldersAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getSession();

      if (ids.length > 0) {
        await db.update(documentFolders)
          .set({ deletedAt: null })
          .where(and(inArray(documentFolders.id, ids), eq(documentFolders.userId, session.userId)));
      }
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to restore folders" };
    }
  });

// ============================================================================
// PERMANENT DELETE ACTIONS
// ============================================================================

export const permanentlyDeleteDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getSession();

      if (ids.length === 0) return { success: true };

      const docsToDelete = await db.select().from(documents).where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));

      await Promise.allSettled(
        docsToDelete.map((doc) =>
          deleteStorageFile(doc.url).catch((e) =>
            console.error("Failed to delete document file", e)
          )
        )
      );

      await db.delete(documents).where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to permanently delete documents" };
    }
  });

export const permanentlyDeleteFoldersAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    try {
      const session = await getSession();

      if (ids.length === 0) return { success: true };

      const docsToDelete = await db.select().from(documents).where(and(inArray(documents.folderId, ids), eq(documents.userId, session.userId)));

      await Promise.allSettled(
        docsToDelete.map((doc) =>
          deleteStorageFile(doc.url).catch((e) =>
            console.error("Failed to delete document file in folder", e)
          )
        )
      );

      await db.delete(documents).where(and(inArray(documents.folderId, ids), eq(documents.userId, session.userId)));
      await db.delete(documentFolders).where(and(inArray(documentFolders.id, ids), eq(documentFolders.userId, session.userId)));
      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to permanently delete folders" };
    }
  });

export const emptyDocumentsTrashAction = actionClient
  .action(async () => {
    try {
      const session = await getSession();

      const docsToDelete = await db.select().from(documents).where(and(isNotNull(documents.deletedAt), eq(documents.userId, session.userId)));

      await Promise.allSettled(
        docsToDelete.map((doc) =>
          deleteStorageFile(doc.url).catch((e) =>
            console.error("Failed to delete document file from trash", e)
          )
        )
      );

      await db.delete(documents).where(and(isNotNull(documents.deletedAt), eq(documents.userId, session.userId)));
      await db.delete(documentFolders).where(and(isNotNull(documentFolders.deletedAt), eq(documentFolders.userId, session.userId)));

      revalidatePath("/documents");
      return { success: true };
    } catch (e) {
      return { failure: e instanceof Error ? e.message : "Failed to empty trash" };
    }
  });
