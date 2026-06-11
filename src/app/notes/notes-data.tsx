import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NotesClient } from "./notes-client";

export async function NotesData() {
  let session;
  try {
    session = await getSession();
  } catch {
    redirect("/login");
  }

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, session.userId))
    .orderBy(desc(notes.updatedAt));

  return <NotesClient initialNotes={userNotes} />;
}
