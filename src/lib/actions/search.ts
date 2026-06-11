"use server";

import { db } from "@/lib/db";
import { tasks, notes, documents } from "@/lib/db/schema";
import { ilike, or, eq, and, isNull, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";
import { actionClient } from "./client";

const searchSchema = z.object({
  query: z.string().min(1),
});

export const globalSearchAction = actionClient
  .schema(searchSchema)
  .action(async ({ parsedInput: { query } }) => {
    try {
      const session = await getSession();

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
              ilike(sql`COALESCE(NULLIF(${notes.title}, ''), 'Untitled')`, searchPattern)
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
