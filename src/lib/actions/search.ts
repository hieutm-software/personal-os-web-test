"use server";

import { db } from "@/lib/db";
import { tasks, notes, documents } from "@/lib/db/schema";
import { ilike, or, eq, and, isNull } from "drizzle-orm";
import { verifySessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";
import { actionClient } from "./client";

const searchSchema = z.object({
  query: z.string().min(1),
});

export const globalSearchAction = actionClient
  .schema(searchSchema)
  .action(async ({ parsedInput: { query } }) => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("session")?.value;
      if (!token) throw new Error("Unauthorized");
      const session = await verifySessionToken(token);
      if (!session) throw new Error("Unauthorized");

      const searchPattern = `%${query}%`;

      // Search Tasks
      const matchingTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, session.userId),
            ilike(tasks.title, searchPattern)
          )
        )
        .limit(5);

      // Search Notes
      const matchingNotes = await db
        .select({
          id: notes.id,
          title: notes.title,
        })
        .from(notes)
        .where(
          and(
            eq(notes.userId, session.userId),
            isNull(notes.deletedAt),
            or(
              ilike(notes.title, searchPattern),
              ilike(notes.content, searchPattern),
              // Fallback for empty titles that should match 'untitled'
            query.toLowerCase().includes("uni") ? eq(notes.title, "") : eq(notes.title, "____impossible_fallback____")
            )
          )
        )
        .limit(5);

      // Search Documents
      const matchingDocs = await db
        .select({
          id: documents.id,
          name: documents.name,
        })
        .from(documents)
        .where(
          and(
            eq(documents.userId, session.userId),
            isNull(documents.deletedAt),
            ilike(documents.name, searchPattern)
          )
        )
        .limit(5);

      return {
        tasks: matchingTasks,
        notes: matchingNotes,
        documents: matchingDocs,
      };
    } catch (err: unknown) {
      console.error("SEARCH ERROR:", err);
      return { tasks: [], notes: [], documents: [] };
    }
  });
