import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const MAX_NEON_BYTES = 150 * 1024 * 1024; // 150MB

/**
 * Estimates the per-user storage footprint by summing text-column lengths
 * across all four user-data tables (notes, tasks, events, vault).
 *
 * Previously this executed 4 separate DB round-trips. It is now a single
 * query using UNION ALL — the database sums each table in one pass and
 * the application accumulates the result in a single aggregation.
 *
 * Returns true if (currentUsage + additionalBytes) fits within the quota.
 */
export async function checkNeonQuota(userId: string, additionalBytes: number = 0): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT SUM(row_size) AS total FROM (
      SELECT COALESCE(SUM(
        COALESCE(LENGTH(content), 0) + COALESCE(LENGTH(title), 0)
      ), 0) AS row_size
      FROM notes WHERE user_id = ${userId}

      UNION ALL

      SELECT COALESCE(SUM(
        COALESCE(LENGTH(title), 0)
      ), 0)
      FROM tasks WHERE user_id = ${userId}

      UNION ALL

      SELECT COALESCE(SUM(
        COALESCE(LENGTH(title), 0) + COALESCE(LENGTH(description), 0)
      ), 0)
      FROM events WHERE user_id = ${userId}

      UNION ALL

      SELECT COALESCE(SUM(
        COALESCE(LENGTH(platform), 0) + COALESCE(LENGTH(username), 0) +
        COALESCE(LENGTH(password_encrypted), 0) + COALESCE(LENGTH(note), 0)
      ), 0)
      FROM vault WHERE user_id = ${userId}
    ) AS sub
  `);

  const totalUsed = Number(result.rows?.[0]?.total ?? 0);
  return (totalUsed + additionalBytes) <= MAX_NEON_BYTES;
}
