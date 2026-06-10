"use server";

import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { createSafeActionClient } from "next-safe-action";
import { cookies } from "next/headers";
import { z } from "zod";
import { eq, and, inArray, isNotNull, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";

const actionClient = createSafeActionClient();

const extractSupabasePath = (url: string) => {
  // First handle the secure local API format
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

export const getUploadUrlAction = actionClient
  .schema(z.object({
    name: z.string().min(1),
    sizeBytes: z.number().min(0),
    folderId: z.string().uuid().nullable().optional(),
  }))
  .action(async ({ parsedInput: { name, sizeBytes } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    const MAX_TOTAL_STORAGE = 300 * 1024 * 1024; // 300MB

    if (sizeBytes > MAX_FILE_SIZE) {
      return { failure: "File size exceeds the 25MB limit." };
    }

    try {
      const [result] = await db
        .select({ total: sum(documents.sizeBytes) })
        .from(documents)
        .where(eq(documents.userId, session.userId));
      const totalUsed = Number(result?.total || 0);

      if (totalUsed + sizeBytes > MAX_TOTAL_STORAGE) {
        return { failure: "Total storage limit of 300MB exceeded." };
      }

      const ext = path.extname(name) || "";
      const uniqueFilename = `${Date.now()}_${uuidv4()}${ext}`;
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
      return { failure: "Upload failed" };
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
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    // Basic security validation: path must start with userId
    if (!supabasePath.startsWith(`${session.userId}/`)) {
      return { failure: "Unauthorized path" };
    }

    const localApiUrl = `/api/files?path=${encodeURIComponent(supabasePath)}`;

    try {
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
    } catch (dbError) {
      console.error("Database insert failed", dbError);
      return { failure: "Database record creation failed" };
    }
  });

export const deleteDocumentAction = actionClient
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput: { id } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, session.userId))).limit(1);
    
    if (!doc) return { failure: "Not found" };

    // Defense-in-depth: bind userId even though ownership was checked above.
    await db.update(documents)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(documents.id, id), eq(documents.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const bulkDeleteDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    await db.update(documents)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const createFolderAction = actionClient
  .schema(z.object({
    name: z.string().min(1),
    parentId: z.string().uuid().nullable().optional(),
  }))
  .action(async ({ parsedInput: { name, parentId } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const [newFolder] = await db.insert(documentFolders).values({
      userId: session.userId,
      name,
      parentId: parentId || null,
    }).returning({ id: documentFolders.id });
    revalidatePath("/documents");
    return { success: true, folderId: newFolder.id };
  });

export const renameFolderAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }))
  .action(async ({ parsedInput: { id, name } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    await db.update(documentFolders)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(and(eq(documentFolders.id, id), eq(documentFolders.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const deleteFolderAction = actionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput: { id } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

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
  });

export const moveDocumentAction = actionClient
  .schema(z.object({
    documentId: z.string().uuid(),
    folderId: z.string().uuid().nullable(),
  }))
  .action(async ({ parsedInput: { documentId, folderId } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    await db.update(documents)
      .set({ folderId, updatedAt: new Date().toISOString() })
      .where(and(eq(documents.id, documentId), eq(documents.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const updateDocumentContentAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    content: z.string(),
  }))
  .action(async ({ parsedInput: { id, content } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const [doc] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, session.userId))).limit(1);
    
    if (!doc) return { failure: "Not found" };

    try {
      const supabasePath = extractSupabasePath(doc.url);
      const buffer = Buffer.from(content, "utf-8");

      if (supabasePath) {
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
      } else {
        const filename = path.basename(doc.url);
        const filePath = path.join(process.cwd(), "public", "uploads", "documents", filename);
        if (fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, buffer);
        }
      }

      // Defense-in-depth: bind userId even though ownership was checked above.
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
      return { failure: "Update failed" };
    }
  });

export const restoreDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    if (ids.length > 0) {
      await db.update(documents)
        .set({ deletedAt: null })
        .where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
    }
    revalidatePath("/documents");
    return { success: true };
  });

export const restoreFoldersAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    if (ids.length > 0) {
      await db.update(documentFolders)
        .set({ deletedAt: null })
        .where(and(inArray(documentFolders.id, ids), eq(documentFolders.userId, session.userId)));
    }
    revalidatePath("/documents");
    return { success: true };
  });

export const permanentlyDeleteDocumentsAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    if (ids.length === 0) return { success: true };

    const docsToDelete = await db.select().from(documents).where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
    
    for (const doc of docsToDelete) {
      try {
        const supabasePath = extractSupabasePath(doc.url);
        if (supabasePath) {
          await withTimeout(supabase.storage.from("personal-os-bucket").remove([supabasePath]));
        } else {
          const filename = path.basename(doc.url);
          const filePath = path.join(process.cwd(), "public", "uploads", "documents", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        console.error("Failed to delete document file", e);
      }
    }

    await db.delete(documents).where(and(inArray(documents.id, ids), eq(documents.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const permanentlyDeleteFoldersAction = actionClient
  .schema(z.object({ ids: z.array(z.string().uuid()) }))
  .action(async ({ parsedInput: { ids } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    if (ids.length === 0) return { success: true };

    const docsToDelete = await db.select().from(documents).where(and(inArray(documents.folderId, ids), eq(documents.userId, session.userId)));
    
    for (const doc of docsToDelete) {
      try {
        const supabasePath = extractSupabasePath(doc.url);
        if (supabasePath) {
          await withTimeout(supabase.storage.from("personal-os-bucket").remove([supabasePath]));
        } else {
          const filename = path.basename(doc.url);
          const filePath = path.join(process.cwd(), "public", "uploads", "documents", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        console.error("Failed to delete document file in folder", e);
      }
    }

    await db.delete(documents).where(and(inArray(documents.folderId, ids), eq(documents.userId, session.userId)));
    await db.delete(documentFolders).where(and(inArray(documentFolders.id, ids), eq(documentFolders.userId, session.userId)));
    revalidatePath("/documents");
    return { success: true };
  });

export const emptyDocumentsTrashAction = actionClient
  .action(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    const docsToDelete = await db.select().from(documents).where(and(isNotNull(documents.deletedAt), eq(documents.userId, session.userId)));
    
    for (const doc of docsToDelete) {
      try {
        const supabasePath = extractSupabasePath(doc.url);
        if (supabasePath) {
          await withTimeout(supabase.storage.from("personal-os-bucket").remove([supabasePath]));
        } else {
          const filename = path.basename(doc.url);
          const filePath = path.join(process.cwd(), "public", "uploads", "documents", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (e) {
        console.error("Failed to delete document file from trash", e);
      }
    }

    await db.delete(documents).where(and(isNotNull(documents.deletedAt), eq(documents.userId, session.userId)));
    await db.delete(documentFolders).where(and(isNotNull(documentFolders.deletedAt), eq(documentFolders.userId, session.userId)));

    revalidatePath("/documents");
    return { success: true };
  });

export const renameDocumentAction = actionClient
  .schema(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }))
  .action(async ({ parsedInput: { id, name } }) => {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return { failure: "Unauthorized" };

    const session = await verifySessionToken(token);
    if (!session) return { failure: "Unauthorized" };

    await db.update(documents)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(and(eq(documents.id, id), eq(documents.userId, session.userId)));
      
    revalidatePath("/documents");
    return { success: true };
  });
