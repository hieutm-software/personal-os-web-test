import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NotesClient } from "./notes-client";

export async function NotesData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  // Explicit column selection — omits `userId` which is not needed on the client.
  const userNotes = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      deletedAt: notes.deletedAt,
    })
    .from(notes)
    .where(eq(notes.userId, session.userId))
    .orderBy(desc(notes.updatedAt));

  // Cast: client receives full Note shape minus userId (unused in UI)
  return <NotesClient initialNotes={userNotes as Parameters<typeof NotesClient>[0]["initialNotes"]} />;
}
