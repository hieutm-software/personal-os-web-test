import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import DocumentsClient from "./documents-client";

export async function DocumentsData() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const [docs, folders] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, session.userId))
      .orderBy(desc(documents.createdAt)),
    db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.userId, session.userId))
      .orderBy(desc(documentFolders.createdAt)),
  ]);

  return <DocumentsClient initialDocs={docs} initialFolders={folders} />;
}
