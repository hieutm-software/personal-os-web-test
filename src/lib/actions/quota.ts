import { db } from "@/lib/db";
import { events, notes, tasks, vault } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const MAX_NEON_BYTES = 150 * 1024 * 1024; // 150MB

export async function checkNeonQuota(userId: string, additionalBytes: number = 0): Promise<boolean> {
  // We estimate the storage used by summing the length of the largest text fields.
  const [notesRes] = await db
    .select({ size: sql<number>`COALESCE(SUM(COALESCE(LENGTH(content), 0) + COALESCE(LENGTH(title), 0)), 0)` })
    .from(notes)
    .where(eq(notes.userId, userId));
    
  const [tasksRes] = await db
    .select({ size: sql<number>`COALESCE(SUM(COALESCE(LENGTH(title), 0)), 0)` })
    .from(tasks)
    .where(eq(tasks.userId, userId));
    
  const [eventsRes] = await db
    .select({ size: sql<number>`COALESCE(SUM(COALESCE(LENGTH(title), 0) + COALESCE(LENGTH(description), 0)), 0)` })
    .from(events)
    .where(eq(events.userId, userId));
    
  const [vaultRes] = await db
    .select({ size: sql<number>`COALESCE(SUM(COALESCE(LENGTH(platform), 0) + COALESCE(LENGTH(username), 0) + COALESCE(LENGTH(password_encrypted), 0) + COALESCE(LENGTH(note), 0)), 0)` })
    .from(vault)
    .where(eq(vault.userId, userId));

  const totalUsed = Number(notesRes?.size || 0) + 
                    Number(tasksRes?.size || 0) + 
                    Number(eventsRes?.size || 0) + 
                    Number(vaultRes?.size || 0);

  return (totalUsed + additionalBytes) <= MAX_NEON_BYTES;
}
