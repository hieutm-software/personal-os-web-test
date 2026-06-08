/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  tasks,
  events,
  notes,
  documentFolders,
  documents,
  vault,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import JSZip from "jszip";
import path from "path";
import fs from "fs/promises";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return new NextResponse("Unauthorized", { status: 401 });

    const session = await verifySessionToken(token);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const userId = session.userId;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Read backup.json
    const backupJsonFile = zip.file("backup.json");
    if (!backupJsonFile) {
      return new NextResponse("Invalid backup format: backup.json missing", { status: 400 });
    }

    const backupJsonStr = await backupJsonFile.async("string");
    const backupData = JSON.parse(backupJsonStr);

    if (!backupData.data) {
      return new NextResponse("Invalid backup format: data missing", { status: 400 });
    }

    const {
      tasks: bTasks,
      events: bEvents,
      notes: bNotes,
      documentFolders: bDocFolders,
      documents: bDocs,
      vault: bVault,
    } = backupData.data;

    // 2. Wipe existing data for this user to avoid conflicts
    // Order matters for foreign keys (if any self-references existed, but here mostly just to userId)
    await db.delete(tasks).where(eq(tasks.userId, userId));
    await db.delete(events).where(eq(events.userId, userId));
    await db.delete(notes).where(eq(notes.userId, userId));
    await db.delete(documents).where(eq(documents.userId, userId));
    await db.delete(documentFolders).where(eq(documentFolders.userId, userId));
    await db.delete(vault).where(eq(vault.userId, userId));

    // 3. Insert Backup Data
    // We insert in batches or all at once if not too large.
    // Filtering to ensure they belong to this user (security check)
    if (bTasks && bTasks.length > 0) {
      await db.insert(tasks).values(bTasks.map((t: any) => ({ ...t, userId })));
    }
    if (bEvents && bEvents.length > 0) {
      await db.insert(events).values(bEvents.map((t: any) => ({ ...t, userId })));
    }
    if (bNotes && bNotes.length > 0) {
      await db.insert(notes).values(bNotes.map((t: any) => ({ ...t, userId })));
    }
    if (bDocFolders && bDocFolders.length > 0) {
      await db.insert(documentFolders).values(bDocFolders.map((t: any) => ({ ...t, userId })));
    }
    if (bDocs && bDocs.length > 0) {
      await db.insert(documents).values(bDocs.map((t: any) => ({ ...t, userId })));
    }
    if (bVault && bVault.length > 0) {
      await db.insert(vault).values(bVault.map((t: any) => ({ ...t, userId })));
    }

    // 4. Restore Physical Files
    const documentsFolder = zip.folder("documents");
    if (documentsFolder) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");
      
      // Ensure directory exists
      await fs.mkdir(uploadsDir, { recursive: true });

      const files = documentsFolder.file(/.*\.?.*/); // get all files
      for (const zipFile of files) {
        if (!zipFile.dir) {
          const filename = path.basename(zipFile.name);
          const buffer = await zipFile.async("nodebuffer");
          const filePath = path.join(uploadsDir, filename);
          await fs.writeFile(filePath, buffer);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Import backup error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
