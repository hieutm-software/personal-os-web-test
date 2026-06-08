import * as dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
import * as path from "path";

// Explicitly load .env.local to ensure Drizzle CLI accesses the correct environment
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in .env.local");
}

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
