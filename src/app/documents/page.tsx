import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, documentFolders } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DocumentsClient from "./documents-client";

export const metadata = {
  title: "Documents | Personal OS",
};

export default async function DocumentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const docs = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, session.userId))
    .orderBy(desc(documents.createdAt));

  const folders = await db
    .select()
    .from(documentFolders)
    .where(eq(documentFolders.userId, session.userId))
    .orderBy(desc(documentFolders.createdAt));

  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <DocumentsClient initialDocs={docs} initialFolders={folders} />
      </div>
    </div>
  );
}
