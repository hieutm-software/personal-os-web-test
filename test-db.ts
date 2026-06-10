import { config } from "dotenv";
// Load .env.local manually
const envConfig = config({ path: ".env.local" }).parsed;
if (envConfig) {
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

import { db } from "./src/lib/db/index";
import { notes } from "./src/lib/db/schema/index";
import { ilike, eq, or, and, isNull } from "drizzle-orm";

async function run() {
  try {
    const searchPattern = "%123%";
    const query = "123";
    console.log("Starting query...");
    const matchingNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
      })
      .from(notes)
      .where(
        and(
          isNull(notes.deletedAt),
          or(
            ilike(notes.title, searchPattern),
            ilike(notes.content, searchPattern),
            query.toLowerCase().includes("uni") ? eq(notes.title, "") : undefined
          )
        )
      )
      .limit(5);
    console.log("Result:", matchingNotes);
  } catch (error) {
    console.error("DB Error:", error);
  }
  process.exit(0);
}

run();
