import { verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NotesClient } from "./notes-client";

export default async function NotesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) redirect("/login");

  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, session.userId))
    .orderBy(desc(notes.updatedAt));

  // Notes uses a full-height master-detail layout — the outer wrapper
  // provides padding and constrains height to the viewport
  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-3.5rem)] md:h-screen">
      <div className="max-w-7xl mx-auto w-full h-full">
        <NotesClient initialNotes={userNotes} />
      </div>
    </div>
  );
}
