import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import * as path from "path";
import { users } from "./schema/index";

// Ensure environment variables are loaded prior to execution
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is explicitly required for seeding.");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function seed() {
  console.log("🌱 Initiating database seed sequence...");

  try {
    // Generate a secure bcrypt hash (Cost >= 12 per security constraint)
    const hashedPassword = await bcrypt.hash("admin123!", 12);

    // Insert the master ADMIN account
    await db
      .insert(users)
      .values({
        username: "admin",
        passwordHash: hashedPassword,
        role: "ADMIN",
      })
      .onConflictDoNothing({ target: users.username });

    console.log("✅ Initial ADMIN account seeded successfully.");
    console.log("➡️  Username: admin");
    console.log("➡️  Password: admin123!");
  } catch (error) {
    console.error("❌ Seeding failed due to a fatal error:", error);
    process.exit(1);
  } finally {
    console.log("🛑 Terminating seeding process.");
    process.exit(0);
  }
}

seed();
