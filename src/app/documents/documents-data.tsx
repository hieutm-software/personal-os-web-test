import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DocumentsClient from "./documents-client";

export async function DocumentsData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

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
