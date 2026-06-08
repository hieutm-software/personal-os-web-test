import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Validate environment variables early to prevent silent connection failures
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is explicitly required but missing in environment variables.",
  );
}

// Initialize the Neon serverless HTTP client
const sql = neon(process.env.DATABASE_URL);

// Initialize and export the Drizzle ORM instance
export const db = drizzle(sql);
