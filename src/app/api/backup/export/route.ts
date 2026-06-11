import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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

export async function GET() {
  try {
    let session;
    try {
      session = await getSession();
    } catch {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.userId;

    // 1. Fetch all data from DB
    const [
      userTasks,
      userEvents,
      userNotes,
      userDocFolders,
      userDocs,
      userVault,
    ] = await Promise.all([
      db.select().from(tasks).where(eq(tasks.userId, userId)),
      db.select().from(events).where(eq(events.userId, userId)),
      db.select().from(notes).where(eq(notes.userId, userId)),
      db.select().from(documentFolders).where(eq(documentFolders.userId, userId)),
      db.select().from(documents).where(eq(documents.userId, userId)),
      db.select().from(vault).where(eq(vault.userId, userId)),
    ]);

    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      data: {
        tasks: userTasks,
        events: userEvents,
        notes: userNotes,
        documentFolders: userDocFolders,
        documents: userDocs,
        vault: userVault,
      },
    };

    // 2. Initialize ZIP
    const zip = new JSZip();

    // 3. Add JSON backup
    zip.file("backup.json", JSON.stringify(backupData, null, 2));

    // 4. Add Physical Files (Documents)
    if (userDocs.length > 0) {
      const documentsFolder = zip.folder("documents");
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "documents");

      for (const doc of userDocs) {
        // Document URL is typically something like "/uploads/documents/filename.ext"
        // Or if it's a supabase URL, we can't just fs.readFile it easily here.
        // Assuming local storage based on the grep results earlier:
        try {
          if (doc.url.startsWith("/uploads/documents/")) {
            const filename = doc.url.replace("/uploads/documents/", "");
            const filePath = path.join(uploadsDir, filename);
            const fileData = await fs.readFile(filePath);
            documentsFolder?.file(filename, fileData);
          }
        } catch (fileErr) {
          console.warn(`Could not read file for document ${doc.id}:`, fileErr);
          // Continue even if one file is missing
        }
      }
    }

    // 5. Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    // 6. Return response
    const filename = `personal_os_backup_${new Date().toISOString().split("T")[0]}.zip`;

    return new NextResponse(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export backup error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
